const db = require('../db');
const bcrypt = require('bcrypt');
const { body, validationResult } = require('express-validator');
const { encrypt, decrypt } = require('../utils/cryptoutils');
const { ALLOWED_MODELS, DEFAULT_MODEL } = require('../services/aiService');

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

// GET /api/users/ai-settings
const getAISettings = async (req, res, next) => {
    try {
        const [rows] = await db.query(
            'SELECT subscription_tier, gemini_api_key, ai_model FROM users WHERE user_id = ?',
            [req.user.userId]
        );
        if (!rows.length) return res.status(404).json({ error: 'User not found' });

        const { subscription_tier, gemini_api_key, ai_model } = rows[0];
        res.json({
            subscription_tier,
            has_byok_key: !!gemini_api_key,
            ai_model: ai_model || DEFAULT_MODEL,
            allowed_models: [...ALLOWED_MODELS],
        });
    } catch (err) {
        next(err);
    }
};

// PATCH /api/users/ai-settings
// Body: { gemini_api_key?: string (plain text — will be encrypted), ai_model?: string, clear_key?: boolean }
const updateAISettings = async (req, res, next) => {
    try {
        const { gemini_api_key, ai_model, clear_key } = req.body;

        const updates = {};

        if (clear_key) {
            updates.gemini_api_key = null;
            updates.ai_model = null;
        } else {
            if (gemini_api_key !== undefined) {
                if (gemini_api_key === '') {
                    updates.gemini_api_key = null;
                } else {
                    updates.gemini_api_key = encrypt(gemini_api_key);
                }
            }

            if (ai_model !== undefined) {
                if (!ALLOWED_MODELS.has(ai_model)) {
                    return res.status(400).json({ error: `Unknown model. Allowed: ${[...ALLOWED_MODELS].join(', ')}` });
                }
                updates.ai_model = ai_model;
            }
        }

        if (!Object.keys(updates).length) {
            return res.status(400).json({ error: 'No valid fields to update.' });
        }

        const cols = Object.keys(updates).map((k) => `${k} = ?`).join(', ');
        await db.query(`UPDATE users SET ${cols} WHERE user_id = ?`, [...Object.values(updates), req.user.userId]);

        res.json({ message: 'AI settings updated.' });
    } catch (err) {
        next(err);
    }
};

// POST /api/users/ping — update study streak (call once per session)
const pingStreak = async (req, res, next) => {
    const userId = req.user.userId;
    try {
        const [[user]] = await db.query(
            'SELECT study_streak, last_active_date FROM users WHERE user_id = ?',
            [userId]
        );

        const today = new Date().toISOString().slice(0, 10);
        const last  = user.last_active_date
            ? new Date(user.last_active_date).toISOString().slice(0, 10)
            : null;

        if (last === today) {
            // Already counted today
            return res.json({ study_streak: user.study_streak, message: 'already counted today' });
        }

        const yesterday = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
        const newStreak  = last === yesterday ? user.study_streak + 1 : 1;

        await db.query(
            'UPDATE users SET study_streak = ?, last_active_date = ? WHERE user_id = ?',
            [newStreak, today, userId]
        );

        res.json({ study_streak: newStreak });
    } catch (err) {
        next(err);
    }
};

module.exports = { registerUser, registerValidation, getUserProfile, getAISettings, updateAISettings, pingStreak };
