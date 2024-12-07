const { decrypt } = require('../utils/cryptoUtils');
const axios = require('axios');
const db = require('../db');

// Fetch Canvas courses
const getCanvasCourses = async (req, res) => {
    try {
        const [account] = await db.query(
            `SELECT access_token FROM linked_accounts WHERE user_id = ? AND lms_name = 'canvas'`,
            [req.user.userId]
        );

        if (!account) {
            console.error('No linked Canvas account found for user:', req.user.userId);
            return res.status(404).json({ error: 'No linked Canvas account found.' });
        }

        if (!account.access_token) {
            console.error('Access token is missing for user:', req.user.userId);
            return res.status(400).json({ error: 'Access token is missing for the linked account.' });
        }

        const decryptedToken = decrypt(account.access_token); // Decrypt the access token
        console.log('Decrypted Canvas Token:', decryptedToken);

        const response = await axios.get('https://canvas.instructure.com/api/v1/courses', {
            headers: { Authorization: `Bearer ${decryptedToken}` },
        });

        res.json(response.data);
    } catch (error) {
        console.error('Error fetching Canvas courses:', error.message || error.response?.data || error);
        res.status(500).json({ error: 'Failed to fetch courses from Canvas.' });
    }
};




// Fetch Google Classroom courses
const getGoogleClassroomCourses = async (req, res) => {
    try {
        const [account] = await db.query(
            `SELECT access_token FROM linked_accounts WHERE user_id = ? AND lms_name = 'googleclassroom'`,
            [req.user.userId]
        );

        if (!account) {
            return res.status(404).json({ error: 'No linked Google Classroom account found.' });
        }

        const response = await axios.get('https://classroom.googleapis.com/v1/courses', {
            headers: { Authorization: `Bearer ${account.access_token}` },
        });

        res.json(response.data.courses || []);
    } catch (error) {
        console.error('Error fetching Google Classroom courses:', error.message);
        res.status(500).json({ error: 'Failed to fetch courses from Google Classroom.' });
    }
};

// Fetch courses from LMS
const fetchCourses = async (req, res) => {
    const { lmsName } = req.params;

    try {
        const [account] = await db.query(
            `SELECT access_token FROM linked_accounts WHERE user_id = ? AND lms_name = ?`,
            [req.user.userId, lmsName]
        );

        if (!account) {
            return res.status(404).json({ error: 'No linked account found.' });
        }

        // Decrypt the token
        const decryptedToken = decrypt(account.access_token);

        // Fetch courses from LMS API
        const response = await axios.get(`https://api.${lmsName}.com/v1/courses`, {
            headers: { Authorization: `Bearer ${decryptedToken}` },
        });

        res.json(response.data);
    } catch (error) {
        console.error('Error fetching courses:', error.message);
        res.status(500).json({ error: 'Failed to fetch courses.' });
    }
}

module.exports = { getCanvasCourses, getGoogleClassroomCourses, fetchCourses };
