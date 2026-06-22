const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/authMiddleware');
const { listCourses, updateCourseColor } = require('../controllers/courseController');
const db = require('../db');

// GET  /api/courses         — list all courses for the user
// PATCH /api/courses/:id/color — set course color
// GET  /api/courses/:id     — single course detail
router.get('/',              verifyToken, listCourses);
router.patch('/:id/color',   verifyToken, updateCourseColor);

router.get('/:id', verifyToken, async (req, res, next) => {
    const userId = req.user.userId;
    const { id } = req.params;

    try {
        const [rows] = await db.query(
            `SELECT c.course_id, c.lms_course_id, c.course_name, c.course_code,
                    c.institution_name, c.start_date AS start_at, c.end_date AS end_at,
                    c.time_zone, c.calendar_ics_url, c.color,
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
