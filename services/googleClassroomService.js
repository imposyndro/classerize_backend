const { google } = require('googleapis');
const classroom = google.classroom('v1');


const auth = new google.auth.OAuth2(
    'your-client-id',
    'your-client-secret',
    'your-redirect-url'
);

// Use stored token to authenticate
auth.setCredentials({
    access_token: 'your-google-access-token',
    refresh_token: 'your-google-refresh-token',
    scope: 'https://www.googleapis.com/auth/classroom.courses',
    token_type: 'Bearer',
    expiry_date: 3599,
});

const addCourse = async (courseDetails) => {
    const { name, description } = courseDetails;

    const course = {
        name,
        section: '1',
        descriptionHeading: name,
        description,
        ownerId: 'me',
        courseState: 'ACTIVE',
    };

    const response = await classroom.courses.create({
        auth,
        requestBody: course,
    });

    return response.data;
};

module.exports = { addCourse };
