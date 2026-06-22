const db = require('../db');

// GET /api/search?q=<term> — search across assignments, courses, grades
const search = async (req, res, next) => {
    const { q } = req.query;
    if (!q || String(q).trim().length < 2) {
        return res.status(400).json({ error: 'Search query must be at least 2 characters.' });
    }

    const userId = req.user.userId;
    const term = `%${String(q).trim()}%`;

    try {
        const [assignments, courses] = await Promise.all([
            db.query(
                `SELECT a.assignment_id, a.assignment_name, a.due_date, a.status,
                        a.points_possible, c.course_name, c.course_code, c.color
                 FROM assignments a
                 JOIN courses c ON a.course_id = c.course_id
                 WHERE a.user_id = ? AND a.assignment_name LIKE ?
                 ORDER BY a.due_date ASC
                 LIMIT 10`,
                [userId, term]
            ),
            db.query(
                `SELECT c.course_id, c.course_name, c.course_code, c.color,
                        c.institution_name, la.lms_name
                 FROM courses c
                 JOIN linked_accounts la ON c.account_id = la.account_id
                 WHERE c.user_id = ? AND (c.course_name LIKE ? OR c.course_code LIKE ?)
                 LIMIT 5`,
                [userId, term, term]
            ),
        ]);

        res.json({
            assignments: assignments[0],
            courses: courses[0],
        });
    } catch (err) {
        next(err);
    }
};

module.exports = { search };
