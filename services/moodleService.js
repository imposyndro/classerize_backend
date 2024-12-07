const axios = require('axios');

const MOODLE_API_BASE_URL = 'https://your-moodle-site.com/webservice/rest/server.php';
const MOODLE_API_TOKEN = 'your-moodle-api-token';

const addCourse = async (courseDetails) => {
    const { name, description } = courseDetails;

    const payload = {
        wstoken: MOODLE_API_TOKEN,
        wsfunction: 'core_course_create_courses',
        courses: JSON.stringify([
            {
                fullname: name,
                shortname: name.toLowerCase().replace(/\s+/g, '_'),
                categoryid: 1,
                summary: description,
            },
        ]),
    };

    const response = await axios.post(MOODLE_API_BASE_URL, payload, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    return response.data;
};

module.exports = { addCourse };
