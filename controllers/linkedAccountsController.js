const { encrypt, decrypt } = require('../utils/cryptoUtils');
const db = require('../db');
const axios = require('axios');
require('dotenv').config();

// POST /api/linked-accounts/auth/canvas
// Links a Canvas account by verifying the token against the Canvas API,
// then storing the encrypted token with the real Canvas user ID.
const linkCanvasAccount = async (req, res, next) => {
    const { token, apiBaseUrl } = req.body;

    if (!token) {
        return res.status(400).json({ error: 'Canvas API token is required.' });
    }

    const baseUrl = (apiBaseUrl || process.env.CANVAS_BASE_URL || 'https://canvas.instructure.com').replace(/\/$/, '');

    try {
        // Verify token against Canvas API and get real user ID
        const canvasResponse = await axios.get(`${baseUrl}/api/v1/users/self`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        const canvasUser = canvasResponse.data;

        const encryptedToken = encrypt(token);

        await db.query(
            `INSERT INTO linked_accounts (user_id, lms_name, lms_user_id, access_token, api_base_url, created_at)
             VALUES (?, 'Canvas', ?, ?, ?, NOW())
             ON DUPLICATE KEY UPDATE access_token = ?, api_base_url = ?, updated_at = NOW()`,
            [req.user.userId, String(canvasUser.id), encryptedToken, baseUrl, encryptedToken, baseUrl]
        );

        res.status(201).json({
            message: 'Canvas account linked successfully.',
            canvasUser: { id: canvasUser.id, name: canvasUser.name },
        });
    } catch (err) {
        if (err.response?.status === 401) {
            return res.status(400).json({ error: 'Invalid Canvas token. Please check and try again.' });
        }
        next(err);
    }
};

// POST /api/linked-accounts/auth/:lmsName  (generic fallback)
const saveLinkedAccount = async (req, res, next) => {
    const { lmsName } = req.params;
    const { accessToken, apiBaseUrl } = req.body;

    if (!accessToken || !lmsName || !apiBaseUrl) {
        return res.status(400).json({ error: 'lmsName, accessToken, and apiBaseUrl are required.' });
    }

    try {
        const encryptedToken = encrypt(accessToken);
        await db.query(
            `INSERT INTO linked_accounts (user_id, lms_name, access_token, api_base_url, created_at)
             VALUES (?, ?, ?, ?, NOW())
             ON DUPLICATE KEY UPDATE access_token = ?, api_base_url = ?, updated_at = NOW()`,
            [req.user.userId, lmsName, encryptedToken, apiBaseUrl, encryptedToken, apiBaseUrl]
        );
        res.status(201).json({ message: `${lmsName} account linked successfully.` });
    } catch (err) {
        next(err);
    }
};

// GET /api/linked-accounts
const getLinkedAccounts = async (req, res, next) => {
    try {
        const [accounts] = await db.query(
            'SELECT account_id, lms_name, lms_user_id, api_base_url, title, created_at FROM linked_accounts WHERE user_id = ?',
            [req.user.userId]
        );
        res.status(200).json(accounts); // Always 200, empty array is valid
    } catch (err) {
        next(err);
    }
};

// GET /api/linked-accounts/accounts/:accountId/courses
const fetchCoursesForAccount = async (req, res, next) => {
    const { accountId } = req.params;

    try {
        const [accounts] = await db.query(
            'SELECT * FROM linked_accounts WHERE account_id = ? AND user_id = ?',
            [accountId, req.user.userId]
        );

        if (!accounts.length) {
            return res.status(404).json({ error: 'Linked account not found.' });
        }

        const account = accounts[0];

        // Token is always stored encrypted — decrypt before use
        const plainToken = decrypt(account.access_token);

        const response = await axios.get(`${account.api_base_url}/api/v1/courses`, {
            headers: { Authorization: `Bearer ${plainToken}` },
            params: { enrollment_state: 'active', per_page: 50 },
        });

        const courses = response.data.map(course => ({
            id: course.id,
            name: course.name,
            course_code: course.course_code,
            start_at: course.start_at,
            end_at: course.end_at || null,
            time_zone: course.time_zone,
            calendar_ics: course.calendar?.ics || null,
        }));

        res.json({ courses });
    } catch (err) {
        if (err.response?.status === 401) {
            return res.status(400).json({ error: 'Canvas token expired or invalid. Please re-link your account.' });
        }
        next(err);
    }
};

// PATCH /api/linked-accounts/:accountId/update-title
const updateAccountTitle = async (req, res, next) => {
    const { accountId } = req.params;
    const { title } = req.body;

    if (!title?.trim()) {
        return res.status(400).json({ error: 'Title is required.' });
    }

    try {
        const [result] = await db.query(
            'UPDATE linked_accounts SET title = ? WHERE account_id = ? AND user_id = ?',
            [title.trim(), accountId, req.user.userId]
        );
        if (!result.affectedRows) {
            return res.status(404).json({ error: 'Account not found.' });
        }
        res.json({ message: 'Account title updated.' });
    } catch (err) {
        next(err);
    }
};

// DELETE /api/linked-accounts/:accountId
const deleteLinkedAccount = async (req, res, next) => {
    const { accountId } = req.params;
    try {
        const [result] = await db.query(
            'DELETE FROM linked_accounts WHERE account_id = ? AND user_id = ?',
            [accountId, req.user.userId]
        );
        if (!result.affectedRows) {
            return res.status(404).json({ error: 'Account not found or not authorized.' });
        }
        res.json({ message: 'Linked account removed.' });
    } catch (err) {
        next(err);
    }
};

module.exports = {
    linkCanvasAccount,
    saveLinkedAccount,
    getLinkedAccounts,
    fetchCoursesForAccount,
    updateAccountTitle,
    deleteLinkedAccount,
};
