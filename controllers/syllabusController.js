const db = require('../db');
const crypto = require('crypto');
const { parseSyllabus } = require('../services/syllabusService');
const { resolveAIOptions } = require('../utils/resolveAIOptions');

// POST /api/syllabus/parse  (multipart: field "syllabus" = PDF)
// Parses the PDF with Gemini and returns extracted course + assignment data.
// Does NOT create anything yet — the user reviews/edits and then confirms.
const parse = async (req, res, next) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No PDF uploaded. Attach a file in the "syllabus" field.' });
        if (req.file.mimetype !== 'application/pdf') {
            return res.status(400).json({ error: 'Only PDF files are supported.' });
        }

        const aiOptions = await resolveAIOptions(req.user.userId);
        const result = await parseSyllabus(req.file.buffer, aiOptions);

        // Log the parse attempt for history.
        await db.query(
            'INSERT INTO syllabus_imports (user_id, filename, items_created, status) VALUES (?, ?, ?, ?)',
            [req.user.userId, req.file.originalname || null, result.assignments.length, 'parsed']
        );

        res.json(result);
    } catch (err) {
        next(err);
    }
};

// POST /api/syllabus/confirm
// Body: { course_id, assignments: [{ name, due_date, points, type }], filename? }
// Bulk-creates the confirmed assignments and mirrors dated ones to the calendar.
const confirm = async (req, res, next) => {
    const userId = req.user.userId;
    const { course_id, assignments, filename } = req.body;

    if (!Number.isInteger(course_id)) {
        return res.status(400).json({ error: 'course_id (integer) is required.' });
    }
    if (!Array.isArray(assignments) || !assignments.length) {
        return res.status(400).json({ error: 'assignments must be a non-empty array.' });
    }

    try {
        // Verify the course belongs to this user.
        const [[course]] = await db.query(
            'SELECT course_id FROM courses WHERE course_id = ? AND user_id = ?',
            [course_id, userId]
        );
        if (!course) return res.status(404).json({ error: 'Course not found.' });

        let created = 0;
        for (const a of assignments) {
            const name = (a.name || '').trim();
            if (!name) continue;

            const dueDate = a.due_date ? new Date(a.due_date) : null;
            const points = a.points != null && Number.isFinite(Number(a.points)) ? Number(a.points) : null;
            const lmsId = `syllabus-${crypto.randomUUID()}`;

            const [result] = await db.query(
                `INSERT INTO assignments
                    (course_id, user_id, lms_assignment_id, assignment_name, due_date,
                     description, points_possible, status)
                 VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')`,
                [course_id, userId, lmsId, name, dueDate, a.type ? `Imported from syllabus (${a.type})` : null, points]
            );

            if (dueDate) {
                await db.query(
                    `INSERT INTO calendar_events (user_id, assignment_id, event_name, event_date, event_type, source)
                     VALUES (?, ?, ?, ?, 'assignment', 'syllabus')`,
                    [userId, result.insertId, name, dueDate]
                );
            }
            created += 1;
        }

        await db.query(
            'INSERT INTO syllabus_imports (user_id, course_id, filename, items_created, status) VALUES (?, ?, ?, ?, ?)',
            [userId, course_id, filename || null, created, 'confirmed']
        );

        res.status(201).json({ message: 'Syllabus imported.', created });
    } catch (err) {
        next(err);
    }
};

// GET /api/syllabus/imports — recent import history
const history = async (req, res, next) => {
    try {
        const [imports] = await db.query(
            `SELECT si.import_id, si.filename, si.items_created, si.status, si.created_at,
                    c.course_name
             FROM syllabus_imports si
             LEFT JOIN courses c ON si.course_id = c.course_id
             WHERE si.user_id = ?
             ORDER BY si.created_at DESC LIMIT 20`,
            [req.user.userId]
        );
        res.json({ imports });
    } catch (err) {
        next(err);
    }
};

module.exports = { parse, confirm, history };
