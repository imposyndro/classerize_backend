const db = require('../db');
const bcrypt = require('bcrypt');
const { body, validationResult } = require('express-validator');

// Validation chain — attach to route before this handler
const registerValidation = [
    body('username').trim().isLength({ min: 3, max: 50 }).withMessage('Username must be 3–50 characters'),
    body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
    body('password')
        .isLength({ min: 8 })
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/)
        .withMessage('Password must be 8+ chars with uppercase, lowercase, number, and special character'),
];

const registerUser = async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { username, email, password } = req.body;

    try {
        // Check uniqueness
        const [existing] = await db.query(
            'SELECT user_id FROM users WHERE email = ? OR username = ?',
            [email, username]
        );
        if (existing.length) {
            return res.status(409).json({ error: 'Email or username already in use.' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const [result] = await db.query(
            'INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)',
            [username, email, hashedPassword]
        );
        res.status(201).json({ message: 'User registered successfully', userId: result.insertId });
    } catch (err) {
        next(err);
    }
};

const getUserProfile = async (req, res, next) => {
    try {
        const [rows] = await db.query(
            'SELECT username, email, created_at FROM users WHERE user_id = ?',
            [req.user.userId]
        );
        if (!rows.length) return res.status(404).json({ error: 'User not found' });
        res.json(rows[0]);
    } catch (err) {
        next(err);
    }
};

module.exports = { registerUser, registerValidation, getUserProfile };
