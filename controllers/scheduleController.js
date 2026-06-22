const db = require('../db');

// GET /api/schedule — list all class sessions for the user
const listSessions = async (req, res, next) => {
    try {
        const [sessions] = await db.query(
            `SELECT s.session_id, s.course_id, s.day_of_week, s.start_time, s.end_time,
                    s.location, s.recurrence_end,
                    c.course_name, c.course_code, c.color
             FROM class_sessions s
             JOIN courses c ON s.course_id = c.course_id
             WHERE s.user_id = ?
             ORDER BY s.day_of_week, s.start_time`,
            [req.user.userId]
        );
        res.json({ sessions });
    } catch (err) {
        next(err);
    }
};

// POST /api/schedule — create a recurring class session
const createSession = async (req, res, next) => {
    const { course_id, day_of_week, start_time, end_time, location, recurrence_end } = req.body;

    if (course_id === undefined || day_of_week === undefined || !start_time || !end_time) {
        return res.status(400).json({ error: 'course_id, day_of_week, start_time, and end_time are required.' });
    }
    if (day_of_week < 0 || day_of_week > 6) {
        return res.status(400).json({ error: 'day_of_week must be 0 (Sun) through 6 (Sat).' });
    }

    try {
        // Verify course belongs to user
        const [[course]] = await db.query(
            'SELECT course_id FROM courses WHERE course_id = ? AND user_id = ?',
            [course_id, req.user.userId]
        );
        if (!course) return res.status(404).json({ error: 'Course not found.' });

        const [result] = await db.query(
            `INSERT INTO class_sessions (user_id, course_id, day_of_week, start_time, end_time, location, recurrence_end)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [req.user.userId, course_id, day_of_week, start_time, end_time,
             location || null, recurrence_end || null]
        );
        res.status(201).json({ message: 'Session created.', session_id: result.insertId });
    } catch (err) {
        next(err);
    }
};

// DELETE /api/schedule/:id
const deleteSession = async (req, res, next) => {
    try {
        const [result] = await db.query(
            'DELETE FROM class_sessions WHERE session_id = ? AND user_id = ?',
            [req.params.id, req.user.userId]
        );
        if (!result.affectedRows) return res.status(404).json({ error: 'Session not found.' });
        res.json({ message: 'Session deleted.' });
    } catch (err) {
        next(err);
    }
};

module.exports = { listSessions, createSession, deleteSession };
