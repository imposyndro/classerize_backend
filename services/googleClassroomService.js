/**
 * googleClassroomService.js — Phase 4 full implementation
 *
 * Uses the Google Classroom REST API via the googleapis SDK.
 * The user's Google OAuth2 token is obtained during Google SSO (passport.js)
 * or via the dedicated Google connect flow in Settings.
 *
 * Scopes required:
 *   https://www.googleapis.com/auth/classroom.courses.readonly
 *   https://www.googleapis.com/auth/classroom.coursework.me.readonly
 *   https://www.googleapis.com/auth/classroom.student-submissions.me.readonly
 */

const { google } = require('googleapis');

class GoogleClassroomService {
    /**
     * @param {string} accessToken   Decrypted Google OAuth2 access token
     * @param {string} refreshToken  Decrypted refresh token (if available)
     */
    constructor(accessToken, refreshToken = null) {
        const auth = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET
        );
        auth.setCredentials({
            access_token: accessToken,
            refresh_token: refreshToken || undefined,
        });
        this.classroom = google.classroom({ version: 'v1', auth });
    }

    async getCourses() {
        const res = await this.classroom.courses.list({
            courseStates: ['ACTIVE'],
            pageSize: 100,
        });
        return res.data.courses || [];
    }

    async getAssignments(courseId) {
        const res = await this.classroom.courses.courseWork.list({
            courseId,
            courseWorkStates: ['PUBLISHED'],
            pageSize: 100,
        });
        return res.data.courseWork || [];
    }

    async getSubmissions(courseId, courseWorkId) {
        const res = await this.classroom.courses.courseWork.studentSubmissions.list({
            courseId,
            courseWorkId,
            states: ['TURNED_IN', 'RETURNED', 'CREATED'],
        });
        return res.data.studentSubmissions || [];
    }

    static normalizeCourse(gcCourse) {
        return {
            lms_course_id: gcCourse.id,
            course_name: gcCourse.name,
            course_code: gcCourse.section || null,
            description: gcCourse.descriptionHeading || null,
        };
    }

    static normalizeAssignment(gcWork) {
        const dueDate = gcWork.dueDate
            ? new Date(
                  gcWork.dueDate.year,
                  gcWork.dueDate.month - 1,
                  gcWork.dueDate.day,
                  gcWork.dueTime?.hours || 23,
                  gcWork.dueTime?.minutes || 59
              )
            : null;

        return {
            lms_assignment_id: gcWork.id,
            assignment_name: gcWork.title,
            due_date: dueDate,
            description: gcWork.description || null,
            points_possible: gcWork.maxPoints || null,
        };
    }
}

module.exports = GoogleClassroomService;
