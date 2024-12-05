// linkedAccountsRoutes.js
const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/authMiddleware');
const db = require('../db');

// Adding linked LMS account route (protected)
router.post('/add', verifyToken, async (req, res) => {
    const { lms_name, lms_user_id, access_token } = req.body;

    if (!lms_name || !lms_user_id || !access_token) {
        return res.status(400).json({ message: 'Please provide lms_name, lms_user_id, and access_token.' });
    }

    try {
        const insertQuery = `
            INSERT INTO linked_accounts (user_id, lms_name, lms_user_id, access_token, refresh_token, token_expiry)
            VALUES (?, ?, ?, ?, ?, ?)`;
        await db.query(insertQuery, [req.user.userId, lms_name, lms_user_id, access_token, req.body.refresh_token, req.body.token_expiry]);
        res.json({ message: 'Linked LMS account added successfully.' });
    } catch (error) {
        console.error('Database error:', error);
        res.status(500).json({ message: 'Database error' });
    }
});

module.exports = router;
