const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { verifyToken } = require('../middleware/authMiddleware');
const db = require('../db');
const {getUserProfile} = require("../controllers/userController");

// Login Route
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const [userResult] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
        if (userResult.length === 0) {
            return res.status(401).json({ message: 'Invalid email or password.' });
        }

        const user = userResult[0];
        const isPasswordValid = bcrypt.compareSync(password, user.password_hash);

        if (!isPasswordValid) {
            return res.status(401).json({ message: 'Invalid email or password.' });
        }

        const token = jwt.sign({ userId: user.user_id }, process.env.JWT_SECRET, { expiresIn: '1h' });

        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 3600000, // 1 hour
        });

        res.status(200).json({ message: 'Login successful' });
    } catch (error) {
        console.error('Error during login:', error);
        res.status(500).json({ message: 'An unexpected error occurred.' });
    }
});

// Logout Route
router.post('/logout', (req, res) => {
    res.clearCookie('token');
    res.status(200).json({ message: 'Logout successful' });
});

// Dashboard Route
router.get('/dashboard', verifyToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const [user] = await db.query('SELECT username, email FROM users WHERE user_id = ?', [userId]);

        if (user.length === 0) {
            return res.status(404).json({ error: 'User not found.' });
        }

        res.status(200).json({ message: 'Welcome to your dashboard', user: user[0] });
    } catch (error) {
        console.error('Error fetching dashboard data:', error);
        res.status(500).json({ error: 'Failed to load dashboard data.' });
    }
});

router.get('/info', verifyToken, getUserProfile);

module.exports = router;
