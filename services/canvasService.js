const axios = require('axios');

class CanvasService {
    /**
     * @param {string} baseUrl  e.g. 'https://canvas.instructure.com'
     * @param {string} token    Plain-text Canvas API token (decrypt before passing in)
     */
    constructor(baseUrl, token) {
        this.client = axios.create({
            baseURL: `${baseUrl.replace(/\/$/, '')}/api/v1`,
            headers: { Authorization: `Bearer ${token}` },
        });
    }

    async getUserProfile() {
        const { data } = await this.client.get('/users/self');
        return data;
    }

    async getCourses(params = {}) {
        const { data } = await this.client.get('/courses', {
            params: { enrollment_state: 'active', per_page: 50, ...params },
        });
        return data;
    }

    async getAssignments(courseId, params = {}) {
        const { data } = await this.client.get(`/courses/${courseId}/assignments`, {
            params: { per_page: 50, order_by: 'due_at', ...params },
        });
        return data;
    }

    async getSubmissions(courseId, params = {}) {
        const { data } = await this.client.get(`/courses/${courseId}/students/submissions`, {
            params: { student_ids: ['self'], per_page: 50, ...params },
        });
        return data;
    }

    async getGrades(courseId) {
        // Returns the current user's enrollment with grades for the course
        const { data } = await this.client.get(`/courses/${courseId}/enrollments`, {
            params: { user_id: 'self', per_page: 1 },
        });
        return data[0] || null;
    }
}

module.exports = CanvasService;
