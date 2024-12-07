const axios = require('axios');

const CANVAS_API_BASE_URL = 'https://csumb.instructure.com/api/v1';
const CANVAS_API_KEY = '2263~7DcQCYWQ8Z33FzFzyUA8JDYEwM6xUzzH7yWQayyNcrt74MwJvFBmYHkvhtYNE2Qw';

const addCourse = async (courseDetails) => {
    const { name, description } = courseDetails;

    const payload = {
        course: {
            name,
            course_code: name,
            start_at: new Date().toISOString(),
            is_public: false,
            description,
        },
    };

    const response = await axios.post(
        `${CANVAS_API_BASE_URL}/accounts/self/courses`,
        payload,
        {
            headers: { Authorization: `Bearer ${CANVAS_API_KEY}` },
        }
    );

    return response.data;
};

module.exports = { addCourse };
