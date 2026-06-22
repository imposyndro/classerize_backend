const db = require('../db');

// GET /api/courses — list all courses for the authenticated user
const listCourses = async (req, res, next) => {
    try {
        const [courses] = await db.query(
            `SELECT c.course_id, c.lms_course_id, c.course_name, c.course_code,
                    c.institution_name, c.start_date, c.end_date, c.color,
                    la.lms_name, la.title AS account_title
             FROM courses c
             JOIN linked_accounts la ON c.account_id = la.account_id
             WHERE c.user_id = ?
             ORDER BY c.course_name`,
            [req.user.userId]
        );
        res.json({ courses });
    } catch (err) {
        next(err);
    }
};

// PATCH /api/courses/:id/color — set or clear course color
const updateCourseColor = async (req, res, next) => {
    const { id } = req.params;
    const { color } = req.body;

    if (color && !/^#[0-9A-Fa-f]{6}$/.test(color)) {
        return res.status(400).json({ error: 'color must be a valid hex color, e.g. #4F46E5' });
    }

    try {
        const [result] = await db.query(
            'UPDATE courses SET color = ? WHERE course_id = ? AND user_id = ?',
            [color || null, id, req.user.userId]
        );
        if (!result.affectedRows) return res.status(404).json({ error: 'Course not found.' });
        res.json({ message: 'Color updated.', color: color || null });
    } catch (err) {
        next(err);
    }
};

module.exports = { listCourses, updateCourseColor };
