const axios = require('axios');


const BLACKBOARD_API_BASE_URL = 'https://<your-blackboard-instance>/learn/api/public/v1';

const CLIENT_ID = 'Db6f7043-45e2-45c7-a157-f5d57c680dde';
const CLIENT_SECRET = '3jnEy09jr9YhQSFoT3nYaiv2b65BLBlg';

// Function to fetch access token
const getAccessToken = async () => {
    try {
        const response = await axios.post(`${BLACKBOARD_API_BASE_URL}/oauth2/token`, null, {
            params: {
                grant_type: 'client_credentials',
            },
            auth: {
                username: CLIENT_ID,
                password: CLIENT_SECRET,
            },
        });

        return response.data.access_token;
    } catch (error) {
        console.error('Error fetching Blackboard access token:', error.response?.data || error.message);
        throw new Error('Failed to authenticate with Blackboard');
    }
};

// Function to fetch courses
const fetchCourses = async (accessToken) => {
    try {
        const response = await axios.get(`${BLACKBOARD_API_BASE_URL}/courses`, {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        });

        return response.data.results;
    } catch (error) {
        console.error('Error fetching Blackboard courses:', error.response?.data || error.message);
        throw new Error('Failed to fetch courses from Blackboard');
    }
};

// Function to add a course
const addCourse = async (accessToken, courseData) => {
    try {
        const response = await axios.post(
            `${BLACKBOARD_API_BASE_URL}/courses`,
            courseData,
            {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
            }
        );

        return response.data;
    } catch (error) {
        console.error('Error adding Blackboard course:', error.response?.data || error.message);
        throw new Error('Failed to add course to Blackboard');
    }
};

module.exports = { getAccessToken, fetchCourses, addCourse };
