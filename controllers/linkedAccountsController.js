const { encrypt, decrypt } = require('../utils/cryptoUtils');
const db = require('../db');

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

        const [accounts] = await db.query('SELECT * FROM linked_accounts WHERE user_id = ?', [userId]);

        if (!accounts.length) {
            return res.status(404).json({ message: 'No linked accounts found.' });
        }

        res.status(200).json(accounts);
    } catch (error) {
        console.error('Error fetching linked accounts:', error.message || error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const linkCanvasAccount = async (req, res) => {
    const {token} = req.body;
    const userId = req.user.userId;

    if (!token) {
        return res.status(400).json({error: 'Canvas token is required.'});
    }

    try {
        // Verify the PAT by calling Canvas API
        const response = await axios.get('https://canvas.instructure.com/api/v1/users/self', {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });

        const canvasUser = response.data;

        // Save linked account details in the database
        const query = `
            INSERT INTO linked_accounts (user_id, lms_name, lms_user_id, access_token, created_at)
            VALUES (?, 'Canvas', ?, ?, NOW())
            ON DUPLICATE KEY UPDATE access_token = VALUES(access_token),
                                    updated_at   = NOW();
        `;
        await db.execute(query, [userId, canvasUser.id, token]);

        res.status(200).json({message: 'Canvas account linked successfully.', user: canvasUser});
    } catch (error) {
        console.error('Error linking Canvas account:', error.message || error);
        res.status(500).json({error: 'Failed to link Canvas account. Check the token and try again.'});
    }
};


module.exports = { saveLinkedAccount, getLinkedAccounts, linkCanvasAccount };
