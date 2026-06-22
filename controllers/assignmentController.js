const db = require('../db');
const { body, query, validationResult } = require('express-validator');
const crypto = require('crypto');
const uuidv4 = () => crypto.randomUUID();

const listAssignments = async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const userId = req.user.userId;
    const { courseId, status, dueBefore, dueAfter, limit = 50, offset = 0 } = req.query;

    const conditions = ['a.user_id = ?'];
    const params = [userId];

    if (courseId)  { conditions.push('a.course_id = ?');  params.push(courseId); }
    if (status)    { conditions.push('a.status = ?');      params.push(status); }
    if (dueBefore) { conditions.push('a.due_date <= ?');   params.push(new Date(dueBefore)); }
    if (dueAfter)  { conditions.push('a.due_date >= ?');   params.push(new Date(dueAfter)); }

    const where = conditions.join(' AND ');

    try {
        const [assignments] = await db.query(
            `SELECT a.assignment_id, a.lms_assignment_id, a.assignment_name, a.due_date,
                    a.description, a.points_possible, a.status, a.submission_type,
                    a.ai_summary, a.progress, a.updated_at,
                    c.course_name, c.course_code, c.institution_name, c.color,
                    la.lms_name, la.title AS account_title
             FROM assignments a
             JOIN courses c ON a.course_id = c.course_id
             JOIN linked_accounts la ON c.account_id = la.account_id
             WHERE ${where}
             ORDER BY CASE WHEN a.due_date IS NULL THEN 1 ELSE 0 END, a.due_date ASC
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

// POST /api/assignments — create a manual assignment (not synced from LMS)
const createAssignment = async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const userId = req.user.userId;
    const { course_id, assignment_name, due_date, description, points_possible, status = 'pending' } = req.body;

    try {
        // Verify the course belongs to this user
        const [[course]] = await db.query(
            'SELECT course_id FROM courses WHERE course_id = ? AND user_id = ?',
            [course_id, userId]
        );
        if (!course) return res.status(404).json({ error: 'Course not found.' });

        const lmsId = `manual-${uuidv4()}`;
        const [result] = await db.query(
            `INSERT INTO assignments
                (course_id, user_id, lms_assignment_id, assignment_name, due_date,
                 description, points_possible, status)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [course_id, userId, lmsId, assignment_name, due_date || null,
             description || null, points_possible || null, status]
        );

        // Mirror to calendar_events
        if (due_date) {
            await db.query(
                `INSERT INTO calendar_events (user_id, assignment_id, event_name, event_date, event_type, source)
                 VALUES (?, ?, ?, ?, 'assignment', 'manual')`,
                [userId, result.insertId, assignment_name, due_date]
            );
        }

        res.status(201).json({ message: 'Assignment created.', assignment_id: result.insertId });
    } catch (err) {
        next(err);
    }
};

// PATCH /api/assignments/:id/status
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

// PATCH /api/assignments/:id/progress — update 0-100 progress
const updateProgress = async (req, res, next) => {
    const { id } = req.params;
    const progress = Number(req.body.progress);

    if (!Number.isInteger(progress) || progress < 0 || progress > 100) {
        return res.status(400).json({ error: 'progress must be an integer 0–100.' });
    }

    const newStatus = progress === 100 ? 'submitted' : undefined;

    try {
        const updateClause = newStatus
            ? 'progress = ?, status = ?, updated_at = NOW()'
            : 'progress = ?, updated_at = NOW()';
        const params = newStatus
            ? [progress, newStatus, id, req.user.userId]
            : [progress, id, req.user.userId];

        const [result] = await db.query(
            `UPDATE assignments SET ${updateClause} WHERE assignment_id = ? AND user_id = ?`,
            params
        );
        if (!result.affectedRows) return res.status(404).json({ error: 'Assignment not found.' });
        res.json({ message: 'Progress updated.', progress, ...(newStatus && { status: newStatus }) });
    } catch (err) {
        next(err);
    }
};

const listAssignmentsValidation = [
    query('limit').optional().isInt({ min: 1, max: 200 }),
    query('offset').optional().isInt({ min: 0 }),
    query('courseId').optional().isInt(),
    query('status').optional().isIn(['pending', 'submitted', 'completed', 'excused', 'overdue']),
];

const createAssignmentValidation = [
    body('course_id').isInt().withMessage('course_id must be an integer'),
    body('assignment_name').trim().notEmpty().withMessage('assignment_name is required'),
    body('due_date').optional({ nullable: true }).isISO8601().withMessage('due_date must be a valid date'),
    body('points_possible').optional({ nullable: true }).isFloat({ min: 0 }),
    body('status').optional().isIn(['pending', 'submitted', 'completed', 'excused']),
];

// GET /api/assignments/suggestions — recommended start dates based on due date + points
const getSuggestions = async (req, res, next) => {
    const userId = req.user.userId;
    try {
        const [assignments] = await db.query(
            `SELECT a.assignment_id, a.assignment_name, a.due_date, a.points_possible,
                    a.status, a.progress, c.course_name, c.course_code, c.color
             FROM assignments a
             JOIN courses c ON a.course_id = c.course_id
             WHERE a.user_id = ? AND a.status IN ('pending') AND a.due_date IS NOT NULL
             ORDER BY a.due_date ASC`,
            [userId]
        );

        const now = Date.now();
        const suggestions = assignments.map((a) => {
            const due      = new Date(a.due_date).getTime();
            const daysLeft = Math.max(0, Math.round((due - now) / 864e5));
            const daysNeeded = Math.max(1, Math.ceil((Number(a.points_possible) || 50) / 50));
            const startDaysBeforeDue = Math.min(daysNeeded, 7);
            const suggestedStartMs   = due - startDaysBeforeDue * 864e5;
            const daysUntilStart     = Math.round((suggestedStartMs - now) / 864e5);

            return {
                ...a,
                suggested_start_date: new Date(suggestedStartMs).toISOString().slice(0, 10),
                days_left:            daysLeft,
                days_until_start:     daysUntilStart,
                urgency:              daysUntilStart <= 0 ? 'urgent' : daysUntilStart <= 2 ? 'soon' : 'upcoming',
            };
        });

        res.json({ suggestions });
    } catch (err) {
        next(err);
    }
};

module.exports = {
    listAssignments,
    createAssignment,
    updateAssignmentStatus,
    updateProgress,
    getSuggestions,
    listAssignmentsValidation,
    createAssignmentValidation,
};
