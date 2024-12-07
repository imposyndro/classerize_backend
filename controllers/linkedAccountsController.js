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


const getLinkedAccount = async (req, res) => {
    const { lmsName } = req.params;

    try {
        const [account] = await db.query(
            `SELECT access_token FROM linked_accounts WHERE user_id = ? AND lms_name = ?`,
            [req.user.userId, lmsName]
        );

        if (!account || !account.access_token) {
            return res.status(404).json({ error: 'No linked account or access token found.' });
        }

        try {
            const decryptedToken = decrypt(account.access_token);
            res.json({ accessToken: decryptedToken });
        } catch (decryptionError) {
            console.error('Decryption error:', decryptionError.message);
            return res.status(500).json({ error: 'Failed to decrypt access token.' });
        }
    } catch (error) {
        console.error('Error retrieving linked account:', error.message);
        res.status(500).json({ error: 'Failed to retrieve account.' });
    }
};

module.exports = { saveLinkedAccount, getLinkedAccount };
