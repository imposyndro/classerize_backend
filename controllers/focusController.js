const db = require('../db');

// POST /api/focus/sessions — log a completed focus session
const logSession = async (req, res, next) => {
    const { assignment_id, duration_minutes } = req.body;
    const userId = req.user.userId;

    if (!duration_minutes || duration_minutes < 1) {
        return res.status(400).json({ error: 'duration_minutes must be at least 1.' });
    }

    try {
        await db.query(
            `INSERT INTO focus_sessions (user_id, assignment_id, duration_minutes)
             VALUES (?, ?, ?)`,
            [userId, assignment_id || null, duration_minutes]
        );

        // Update time_spent_minutes on the linked assignment
        if (assignment_id) {
            await db.query(
                `UPDATE assignments
                 SET time_spent_minutes = time_spent_minutes + ?
                 WHERE assignment_id = ? AND user_id = ?`,
                [duration_minutes, assignment_id, userId]
            );
        }

        res.status(201).json({ message: 'Session logged.', duration_minutes });
    } catch (err) {
        next(err);
    }
};

// GET /api/focus/stats — weekly focus summary
const getStats = async (req, res, next) => {
    const userId = req.user.userId;
    try {
        const [[week]] = await db.query(
            `SELECT COALESCE(SUM(duration_minutes), 0) AS total_minutes_this_week,
                    COUNT(*) AS sessions_this_week
             FROM focus_sessions
             WHERE user_id = ?
               AND completed_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)`,
            [userId]
        );

        const [[allTime]] = await db.query(
            `SELECT COALESCE(SUM(duration_minutes), 0) AS total_minutes_all_time
             FROM focus_sessions WHERE user_id = ?`,
            [userId]
        );

        res.json({
            total_minutes_this_week: Number(week.total_minutes_this_week),
            sessions_this_week:      Number(week.sessions_this_week),
            total_minutes_all_time:  Number(allTime.total_minutes_all_time),
        });
    } catch (err) {
        next(err);
    }
};

module.exports = { logSession, getStats };
