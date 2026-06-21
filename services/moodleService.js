/**
 * moodleService.js — Phase 4 full implementation
 *
 * Moodle uses a web services REST API with a user-generated token.
 * Users generate a token in Moodle: Profile → Security Keys → Web service tokens.
 * They supply the token + their institution's Moodle URL when linking.
 *
 * Required Moodle web service functions (must be enabled by the institution):
 *   core_webservice_get_site_info
 *   core_enrol_get_users_courses
 *   mod_assign_get_assignments
 *   gradereport_user_get_grades_table
 */

const axios = require('axios');

class MoodleService {
    /**
     * @param {string} baseUrl  e.g. 'https://moodle.institution.edu'
     * @param {string} token    Plain-text Moodle web service token
     */
    constructor(baseUrl, token) {
        this.baseUrl = baseUrl.replace(/\/$/, '');
        this.token = token;
        this.endpoint = `${this.baseUrl}/webservice/rest/server.php`;
    }

    async call(wsFunction, params = {}) {
        const { data } = await axios.get(this.endpoint, {
            params: {
                wstoken: this.token,
                wsfunction: wsFunction,
                moodlewsrestformat: 'json',
                ...params,
            },
        });

        if (data?.exception) {
            throw new Error(`Moodle API error (${wsFunction}): ${data.message}`);
        }

        return data;
    }

    async getSiteInfo() {
        return this.call('core_webservice_get_site_info');
    }

    async getCourses() {
        const info = await this.getSiteInfo();
        const userId = info.userid;
        const data = await this.call('core_enrol_get_users_courses', { userid: userId });
        return Array.isArray(data) ? data : [];
    }

    async getAssignments(courseId) {
        const data = await this.call('mod_assign_get_assignments', {
            'courseids[0]': courseId,
        });
        const course = (data.courses || [])[0];
        return course?.assignments || [];
    }

    async getGrades(courseId) {
        try {
            const data = await this.call('gradereport_user_get_grades_table', {
                courseid: courseId,
            });
            return data?.tables?.[0]?.tabledata || [];
        } catch {
            return []; // Grades endpoint often disabled; non-fatal
        }
    }

    static normalizeCourse(moodleCourse) {
        return {
            lms_course_id: String(moodleCourse.id),
            course_name: moodleCourse.fullname,
            course_code: moodleCourse.shortname || null,
            start_at: moodleCourse.startdate ? new Date(moodleCourse.startdate * 1000) : null,
            end_at: moodleCourse.enddate ? new Date(moodleCourse.enddate * 1000) : null,
        };
    }

    static normalizeAssignment(moodleAssign) {
        return {
            lms_assignment_id: String(moodleAssign.id),
            assignment_name: moodleAssign.name,
            due_date: moodleAssign.duedate ? new Date(moodleAssign.duedate * 1000) : null,
            description: moodleAssign.intro || null,
            points_possible: moodleAssign.grade || null,
        };
    }
}

module.exports = MoodleService;
