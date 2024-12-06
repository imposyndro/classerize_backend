const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const verifyToken = require('../middleware/authMiddleware');
const db = require('../db');

// Register Route
router.post('/register', async (req, res) => {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
        return res.status(400).json({ message: 'Please provide username, email, and password.' });
    }

    try {
        // Check if user exists
        const [existingUser] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
        if (existingUser.length > 0) {
            return res.status(409).json({ message: 'User with this email already exists.' });
        }

        // Register user
        const hashedPassword = bcrypt.hashSync(password, 10);
        await db.query('INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)', [username, email, hashedPassword]);
        res.status(201).json({ message: 'User registered successfully.' });
    } catch (error) {
        console.error('Database error:', error);
        res.status(500).json({ message: 'An unexpected error occurred.' });
    }
});

// Login Route
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        console.log('Login attempt for email:', email);

        const [userResult] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
        if (userResult.length === 0) {
            console.log('User not found for email:', email);
            return res.status(401).json({ message: 'Invalid email or password.' });
        }

        const user = userResult[0];
        const isPasswordValid = bcrypt.compareSync(password, user.password_hash);
        console.log('Password validation:', isPasswordValid);

        if (!isPasswordValid) {
            console.log('Password mismatch for user:', email);
            return res.status(401).json({ message: 'Invalid email or password.' });
        }

        const token = jwt.sign({ userId: user.user_id }, process.env.JWT_SECRET, { expiresIn: '1h' });
        console.log('Token generated successfully for user:', email);

        res.cookie('token', token, {
            httpOnly: true, // Ensures the cookie is not accessible via JavaScript
            secure: process.env.NODE_ENV === 'production', // Set to true only in production
            sameSite: 'strict', // Prevents CSRF attacks
            maxAge: 3600000, // Cookie lifespan: 1 hour
        });

        res.status(200).json({ message: 'Login successful' });
    } catch (error) {
        console.error('Database or server error:', error);
        res.status(500).json({ message: 'An unexpected error occurred.' });
    }
});


// Logout Route
router.post('/logout', (req, res) => {
    res.clearCookie('token');
    res.status(200).json({ message: 'Logout successful' });
});

// Dashboard Route
router.get('/dashboard', verifyToken, (req, res) => {
    res.status(200).json({ message: 'Welcome to your dashboard' });
});

module.exports = router;
