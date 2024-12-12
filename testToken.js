const axios = require("axios");

const accessToken = "2263~7DcQCYWQ8Z33FzFzyUA8JDYEwM6xUzzH7yWQayyNcrt74MwJvFBmYHkvhtYNE2Qw";

async function testToken() {
    try {
        const response = await axios.get("https://canvas.instructure.com/api/v1/courses", {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        });
        console.log("Courses:", response.data);
    } catch (error) {
        console.error("Error:", error.response ? error.response.data : error.message);
    }
}

testToken();
