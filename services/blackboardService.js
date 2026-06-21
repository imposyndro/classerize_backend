/**
 * blackboardService.js — Phase 4 full implementation
 *
 * Blackboard uses OAuth2 client_credentials for system-level tokens
 * and a 3-legged OAuth2 flow for user-scoped tokens.
 *
 * Per-user linking flow:
 * 1. User provides their institution's Blackboard URL + an OAuth app key/secret
 *    (or we use our registered app and redirect them through the authorization code flow)
 * 2. We exchange for a user-scoped access token and store it encrypted.
 *
 * For now: token-based auth (user provides a REST API token from Blackboard UI).
 */

const axios = require('axios');

class BlackboardService {
    /**
     * @param {string} baseUrl  e.g. 'https://institution.blackboard.com/learn/api/public/v1'
     * @param {string} token    Plain-text user access token (decrypted before passing in)
     */
    constructor(baseUrl, token) {
        this.client = axios.create({
            baseURL: baseUrl.replace(/\/$/, ''),
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });
    }

    async getCourses() {
        const { data } = await this.client.get('/courses', {
            params: { fields: 'id,name,courseId,ultraStatus,enrollment', limit: 200 },
        });
        return data.results || [];
    }

    async getAssignments(courseId) {
        const { data } = await this.client.get(`/courses/${courseId}/contents`, {
            params: { fields: 'id,title,contentHandler,availability,dates,grading', limit: 200 },
        });
        // Blackboard returns contents; filter to assignment-type items
        return (data.results || []).filter(
            (c) => c.contentHandler?.id === 'resource/x-bb-assignment'
        );
    }

    async getGrades(courseId) {
        const { data } = await this.client.get(`/courses/${courseId}/gradebook/columns`, {
            params: { fields: 'id,name,score', limit: 200 },
        });
        return data.results || [];
    }

    /**
     * Normalize a Blackboard course to the internal format used by syncService.
     */
    static normalizeCourse(bbCourse) {
        return {
            lms_course_id: bbCourse.id,
            course_name: bbCourse.name,
            course_code: bbCourse.courseId || null,
            start_at: bbCourse.term?.startDate || null,
            end_at: bbCourse.term?.endDate || null,
        };
    }

    static normalizeAssignment(bbContent) {
        return {
            lms_assignment_id: bbContent.id,
            assignment_name: bbContent.title,
            // BB content due date lives in grading.due or dates.due
            due_date: bbContent.grading?.due || bbContent.dates?.due || null,
            description: bbContent.description?.rawText || null,
            // Score is nested in grading.score.possible
            points_possible: bbContent.grading?.score?.possible || null,
        };
    }
}

module.exports = BlackboardService;
