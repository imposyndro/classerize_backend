const axios = require('axios');
const db = require('../db');

const fetchCanvasUserId = async (accessToken) => {
    try {
        const response = await axios.get('https://csumb.instructure.com/api/v1/users/self', {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        });
        console.log('Fetched Canvas User ID:', response.data.id); // Debug log
        return response.data.id;
    } catch (error) {
        console.error('Error fetching Canvas user ID:', error.response?.data || error.message);
        throw new Error('Failed to fetch user ID from Canvas.');
    }
};

const fetchAccountDetails = async (userId, lmsName) => {
    try {
        const [linkedAccount] = await db.query(
            `SELECT api_base_url, api_key 
             FROM linked_accounts 
             WHERE user_id = ? AND lms_name = ?`,
            [userId, lmsName]
        );

        if (!linkedAccount) {
            throw new Error(`${lmsName} account not linked for user.`);
        }

        return {
            baseUrl: linkedAccount.api_base_url,
            apiKey: linkedAccount.api_key,
        };
    } catch (error) {
        console.error('Error fetching linked account details:', error);
        throw error;
    }
};

module.exports = {
    fetchCanvasUserId,
    fetchAccountDetails,
};
