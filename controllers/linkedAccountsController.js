const { encrypt, decrypt } = require('../utils/cryptoUtils');
const db = require('../db');
const axios = require('axios');

require('dotenv').config();

const saveLinkedAccount = async (req, res) => {
    const { lmsName } = req.params;
    const { accessToken } = req.body;

    try {
        if (!accessToken || !lmsName) {
            return res.status(400).json({ error: 'LMS name and access token are required.' });
        }

        const apiBaseUrl = lmsName === 'canvas' ? 'https://canvas.instructure.com' : '';
        const encryptedToken = encrypt(accessToken);

        await db.query(
            `INSERT INTO linked_accounts (user_id, lms_name, access_token, api_base_url, created_at)
             VALUES (?, ?, ?, ?, NOW())
             ON DUPLICATE KEY UPDATE access_token = ?, api_base_url = ?, updated_at = NOW()`,
            [req.user.userId, lmsName, encryptedToken, apiBaseUrl, encryptedToken, apiBaseUrl]
        );

        res.status(201).json({ message: `${lmsName} account linked successfully.` });
    } catch (error) {
        console.error('Error saving linked account:', error.message || error);
        res.status(500).json({ error: 'Failed to link account.' });
    }
};

const getLinkedAccounts = async (req, res) => {
    try {
        const userId = req.user.userId;
        console.log('Fetching linked accounts for userId:', userId);

        const [accounts] = await db.query('SELECT * FROM linked_accounts WHERE user_id = ?', [userId]);
        console.log('Query Result:', accounts);

        if (!accounts.length) {
            return res.status(404).json({ message: 'No linked accounts found.' });
        }

        res.status(200).json(accounts);
    } catch (error) {
        console.error('Error fetching linked accounts:', error.message);
        res.status(500).json({ error: 'Internal server error.' });
    }
};

const fetchCoursesForAccount = async (req, res) => {
    const { accountId } = req.params;

    try {
        // Query database for the linked account
        const [accounts] = await db.query("SELECT * FROM linked_accounts WHERE account_id = ?", [accountId]);

        if (!accounts || accounts.length === 0) {
            return res.status(404).json({ error: "Account not found" });
        }

        const account = accounts[0];
        const { access_token } = account;

        if (!access_token) {
            return res.status(400).json({ error: "Access token is missing for the linked account" });
        }

        console.log("Using access token:", access_token);

        // Fetch courses from the Canvas API
        const response = await axios.get(`${account.api_base_url}/api/v1/courses`, {
            headers: {
                Authorization: `Bearer ${access_token}`,
            },
        });

        const courses = response.data.map(course => ({
            id: course.id,
            name: course.name,
            course_code: course.course_code,
            start_at: course.start_at,
            end_at: course.end_at || "Ongoing",
            time_zone: course.time_zone,
            calendar_link: course.calendar?.ics,
        }));

        res.json({ courses });
    } catch (error) {
        if (error.response) {
            console.error("Canvas API Error:", error.response.data);
            return res.status(error.response.status).json({ error: error.response.data });
        }

        console.error("Error fetching courses:", error.message);
        res.status(500).json({ error: "Failed to fetch courses" });
    }
};

const updateAccountTitle = async (req, res) => {
    const { accountId } = req.params;
    const { title } = req.body;

    try {
        const result = await db.query(
            'UPDATE linked_accounts SET title = ? WHERE account_id = ?',
            [title, accountId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Account not found' });
        }

        res.status(200).json({ message: 'Account title updated successfully' });
    } catch (error) {
        console.error('Error updating account title:', error.message);
        res.status(500).json({ error: 'Failed to update account title' });
    }
};

const linkCanvasAccount = async (req, res) => {
    const { token } = req.body;

    if (!token) {
        return res.status(400).json({ error: 'Canvas token is required.' });
    }

    try {
        console.log('Received token for linking Canvas account:', token);
        const apiBaseUrl = 'https://canvas.instructure.com';

        // Mocked API response (replace with actual Canvas API integration)
        const canvasUser = { id: '12345', name: 'John Doe' };

        // Insert a new linked account into the database
        await db.query(
            `INSERT INTO linked_accounts (user_id, lms_name, lms_user_id, access_token, api_base_url, created_at)
             VALUES (?, ?, ?, ?, ?, NOW())`,
            [
                req.user.userId, // The user's ID from the token
                'Canvas',        // The name of the LMS
                canvasUser.id,   // The LMS-specific user ID
                token,           // The access token for Canvas
                apiBaseUrl,      // The base URL for the Canvas API
            ]
        );

        console.log('Canvas account linked successfully for user:', req.user.userId);
        res.status(200).json({ message: 'Canvas account linked successfully.' });
    } catch (error) {
        console.error('Error linking Canvas account:', error.message);
        res.status(500).json({ error: 'Failed to link Canvas account. Please try again.' });
    }
};





module.exports = { linkCanvasAccount, saveLinkedAccount, getLinkedAccounts, fetchCoursesForAccount, updateAccountTitle };