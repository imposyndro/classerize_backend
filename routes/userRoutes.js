// backend/routes/userRoutes.js
const express = require('express');
const router = express.Router();
const db = require('../db'); // Ensure db is using pool.promise()
const bcrypt = require('bcrypt');
const verifyToken = require('../middleware/authMiddleware'); // Import middleware

// Protected Route - Get user profile
router.get('/profile', verifyToken, async (req, res) => {
    try {
        console.log('User ID from token:', req.user.userId); // Debugging log for user ID
        if (!req.user || !req.user.userId) {
            return res.status(401).json({ error: 'Unauthorized, no valid token' });
        }

        const [rows] = await db.query('SELECT username, email, created_at FROM users WHERE user_id = ?', [req.user.userId]);

        if (rows.length === 0) {
            console.log('No user found for ID:', req.user.userId);
            return res.status(404).json({ error: 'User not found' });
        }

        res.json(rows[0]);
    } catch (error) {
        console.error('Database error:', error.message);
        res.status(500).json({ error: 'Database error' });
    }
});



module.exports = router;
