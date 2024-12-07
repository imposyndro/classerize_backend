const { decrypt } = require('../utils/cryptoUtils');
const db = require('../db');
const axios = require('axios');

const fetchCourses = async (req, res) => {
    const { lmsName } = req.params;

    try {
        const linkedAccount = await db.query(
            `SELECT access_token, api_base_url FROM linked_accounts WHERE user_id = ? AND lms_name = ?`,
            [req.user.userId, lmsName]
        );

        if (linkedAccount.length === 0) {
            return res.status(400).json({ error: 'Access token is missing for the linked account.' });
        }

        const { access_token, api_base_url } = linkedAccount[0];
        const decryptedToken = decrypt(access_token);

        const response = await axios.get(`${api_base_url}/api/v1/courses`, {
            headers: { Authorization: `Bearer ${decryptedToken}` },
        });

        res.status(200).json(response.data);
    } catch (error) {
        console.error('Error fetching courses:', error.message || error);
        res.status(500).json({ error: 'Failed to fetch courses.' });
    }
};

module.exports = { fetchCourses };
