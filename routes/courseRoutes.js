const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/authMiddleware');
const db = require('../db');

// GET /api/courses/:id  — fetch one course by lms_course_id (or internal course_id)
// The course detail page passes the LMS-sourced course id from AccountCard
router.get('/:id', verifyToken, async (req, res, next) => {
    const userId = req.user.userId;
    const { id } = req.params;

    try {
        // Try internal course_id first, then fall back to lms_course_id
        const [rows] = await db.query(
            `SELECT c.course_id, c.lms_course_id, c.course_name, c.course_code,
                    c.institution_name, c.start_date AS start_at, c.end_date AS end_at,
                    c.time_zone, c.calendar_ics_url,
                    la.lms_name, la.title AS account_title
             FROM courses c
             JOIN linked_accounts la ON c.account_id = la.account_id
             WHERE c.user_id = ?
               AND (c.course_id = ? OR c.lms_course_id = ?)
             LIMIT 1`,
            [userId, Number(id) || 0, String(id)]
        );

        if (!rows.length) return res.status(404).json({ error: 'Course not found.' });
        res.json(rows[0]);
    } catch (err) {
        next(err);
    }
});

module.exports = router;
