const db = require('../db');

// GET /api/grades?courseId=
const listGrades = async (req, res, next) => {
    const userId = req.user.userId;
    const { courseId } = req.query;

    const conditions = ['g.user_id = ?'];
    const params = [userId];
    if (courseId) { conditions.push('g.course_id = ?'); params.push(courseId); }

    try {
        const [grades] = await db.query(
            `SELECT g.grade_id, g.course_id, g.assignment_id,
                    g.score, g.points_possible, g.grade_percent, g.letter_grade,
                    g.submitted_at, g.graded_at,
                    c.course_name, c.course_code, c.institution_name,
                    a.assignment_name
             FROM grades g
             JOIN courses c ON g.course_id = c.course_id
             LEFT JOIN assignments a ON g.assignment_id = a.assignment_id
             WHERE ${conditions.join(' AND ')}
             ORDER BY g.graded_at DESC`,
            params
        );
        res.json({ grades });
    } catch (err) {
        next(err);
    }
};

// GET /api/grades/summary — one row per course with current grade
const gradesSummary = async (req, res, next) => {
    const userId = req.user.userId;
    try {
        const [summary] = await db.query(
            `SELECT g.course_id, c.course_name, c.course_code, c.institution_name,
                    la.lms_name, la.title AS account_title,
                    g.grade_percent, g.letter_grade
             FROM grades g
             JOIN courses c ON g.course_id = c.course_id
             JOIN linked_accounts la ON c.account_id = la.account_id
             WHERE g.user_id = ? AND g.assignment_id IS NULL
             ORDER BY c.course_name`,
            [userId]
        );
        res.json({ summary });
    } catch (err) {
        next(err);
    }
};

module.exports = { listGrades, gradesSummary };
