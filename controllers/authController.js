const db = require('../db');

// GET /api/auth/current-user — returns logged-in user's public profile
const getCurrentUser = async (req, res, next) => {
    try {
        const [rows] = await db.query(
            'SELECT user_id, username, email, study_streak, last_active_date, onboarding_complete, created_at FROM users WHERE user_id = ?',
            [req.user.userId]
        );
        if (!rows.length) return res.status(404).json({ error: 'User not found' });
        res.json(rows[0]);
    } catch (err) {
        next(err);
    }
};

module.exports = { getCurrentUser };
