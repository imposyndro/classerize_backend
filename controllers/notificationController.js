const db = require('../db');

// GET /api/notifications
const listNotifications = async (req, res, next) => {
    try {
        const [notifications] = await db.query(
            `SELECT n.notification_id, n.assignment_id, n.notification_type,
                    n.message, n.notification_time, n.sent, n.read_at, n.created_at,
                    a.assignment_name
             FROM notifications n
             LEFT JOIN assignments a ON n.assignment_id = a.assignment_id
             WHERE n.user_id = ?
             ORDER BY n.created_at DESC
             LIMIT 50`,
            [req.user.userId]
        );
        res.json({ notifications });
    } catch (err) {
        next(err);
    }
};

// PATCH /api/notifications/:id/read
const markRead = async (req, res, next) => {
    try {
        const [result] = await db.query(
            'UPDATE notifications SET read_at = NOW() WHERE notification_id = ? AND user_id = ?',
            [req.params.id, req.user.userId]
        );
        if (!result.affectedRows) return res.status(404).json({ error: 'Notification not found.' });
        res.json({ message: 'Marked as read.' });
    } catch (err) {
        next(err);
    }
};

// GET /api/notifications/preferences
const getPreferences = async (req, res, next) => {
    try {
        const [rows] = await db.query(
            'SELECT * FROM notification_preferences WHERE user_id = ?',
            [req.user.userId]
        );
        if (!rows.length) {
            // Return defaults
            return res.json({ email_enabled: true, web_enabled: true, daily_digest: true, deadline_hours: 24 });
        }
        res.json(rows[0]);
    } catch (err) {
        next(err);
    }
};

// PUT /api/notifications/preferences
const updatePreferences = async (req, res, next) => {
    const { email_enabled, web_enabled, daily_digest, deadline_hours } = req.body;
    try {
        await db.query(
            `INSERT INTO notification_preferences (user_id, email_enabled, web_enabled, daily_digest, deadline_hours)
             VALUES (?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE
                email_enabled = VALUES(email_enabled),
                web_enabled   = VALUES(web_enabled),
                daily_digest  = VALUES(daily_digest),
                deadline_hours = VALUES(deadline_hours),
                updated_at = NOW()`,
            [req.user.userId, email_enabled ?? true, web_enabled ?? true, daily_digest ?? true, deadline_hours ?? 24]
        );
        res.json({ message: 'Preferences updated.' });
    } catch (err) {
        next(err);
    }
};

module.exports = { listNotifications, markRead, getPreferences, updatePreferences };
