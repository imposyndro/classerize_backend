const axios = require("axios");

class CanvasService {
    constructor(baseUrl, token) {
        this.client = axios.create({
            baseURL: baseUrl,
            headers: { Authorization: `Bearer ${token}` },
        });
    }

    async getUserProfile() {
        const response = await this.client.get("/users/self");
        return response.data;
    }

    async getCourses() {
        const response = await this.client.get("/courses");
        return response.data;
    }
}

module.exports = CanvasService;
