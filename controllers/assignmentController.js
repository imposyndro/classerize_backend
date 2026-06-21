const db = require('../db');
const { body, query, validationResult } = require('express-validator');

const listAssignments = async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const userId = req.user.userId;
    const { courseId, status, dueBefore, dueAfter, limit = 50, offset = 0 } = req.query;

    const conditions = ['a.user_id = ?'];
    const params = [userId];

    if (courseId) { conditions.push('a.course_id = ?'); params.push(courseId); }
    if (status)   { conditions.push('a.status = ?');    params.push(status); }
    if (dueBefore) { conditions.push('a.due_date <= ?'); params.push(new Date(dueBefore)); }
    if (dueAfter)  { conditions.push('a.due_date >= ?'); params.push(new Date(dueAfter)); }

    const where = conditions.join(' AND ');

    try {
        const [assignments] = await db.query(
            `SELECT a.assignment_id, a.lms_assignment_id, a.assignment_name, a.due_date,
                    a.description, a.points_possible, a.status, a.submission_type,
                    a.ai_summary, a.updated_at,
                    c.course_name, c.course_code, c.institution_name,
                    la.lms_name, la.title AS account_title
             FROM assignments a
             JOIN courses c ON a.course_id = c.course_id
             JOIN linked_accounts la ON c.account_id = la.account_id
             WHERE ${where}
             ORDER BY a.due_date ASC NULLS LAST
             LIMIT ? OFFSET ?`,
            [...params, Number(limit), Number(offset)]
        );

        const [[{ total }]] = await db.query(
            `SELECT COUNT(*) AS total FROM assignments a WHERE ${where}`,
            params
        );

        res.json({ assignments, total, limit: Number(limit), offset: Number(offset) });
    } catch (err) {
        next(err);
    }
};

const updateAssignmentStatus = async (req, res, next) => {
    const { id } = req.params;
    const { status } = req.body;
    const allowed = ['pending', 'submitted', 'completed', 'excused'];

    if (!allowed.includes(status)) {
        return res.status(400).json({ error: `status must be one of: ${allowed.join(', ')}` });
    }

    try {
        const [result] = await db.query(
            'UPDATE assignments SET status = ?, updated_at = NOW() WHERE assignment_id = ? AND user_id = ?',
            [status, id, req.user.userId]
        );
        if (!result.affectedRows) return res.status(404).json({ error: 'Assignment not found.' });
        res.json({ message: 'Status updated.', status });
    } catch (err) {
        next(err);
    }
};

const listAssignmentsValidation = [
    query('limit').optional().isInt({ min: 1, max: 200 }),
    query('offset').optional().isInt({ min: 0 }),
    query('courseId').optional().isInt(),
    query('status').optional().isIn(['pending', 'submitted', 'completed', 'excused']),
];

module.exports = { listAssignments, updateAssignmentStatus, listAssignmentsValidation };
