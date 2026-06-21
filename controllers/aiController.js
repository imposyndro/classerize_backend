const db = require('../db');
const { summarizeAssignment, generateStudySchedule, assessUrgency } = require('../services/aiService');
const { resolveAIOptions } = require('../utils/resolveAIOptions');

// GET /api/ai/study-schedule
const studySchedule = async (req, res, next) => {
    try {
        const [assignments] = await db.query(
            `SELECT a.assignment_id, a.assignment_name, a.due_date, a.status, a.points_possible,
                    c.course_name
             FROM assignments a
             JOIN courses c ON a.course_id = c.course_id
             WHERE a.user_id = ? AND a.status = 'pending' AND a.due_date > NOW()
             ORDER BY a.due_date ASC LIMIT 15`,
            [req.user.userId]
        );

        const aiOptions = await resolveAIOptions(req.user.userId);
        const schedule = await generateStudySchedule(assignments, aiOptions);
        res.json({ schedule });
    } catch (err) {
        next(err);
    }
};

// GET /api/ai/urgency
const urgencyAssessment = async (req, res, next) => {
    try {
        const [assignments] = await db.query(
            `SELECT a.assignment_id, a.assignment_name, a.due_date, a.status, a.points_possible,
                    c.course_name
             FROM assignments a
             JOIN courses c ON a.course_id = c.course_id
             WHERE a.user_id = ? AND a.status = 'pending' AND a.due_date > NOW()
             ORDER BY a.due_date ASC LIMIT 15`,
            [req.user.userId]
        );

        const aiOptions = await resolveAIOptions(req.user.userId);
        const urgency = await assessUrgency(assignments, aiOptions);
        res.json({ urgency });
    } catch (err) {
        next(err);
    }
};

// POST /api/ai/summarize/:assignmentId
const summarizeOne = async (req, res, next) => {
    const { assignmentId } = req.params;
    try {
        const [rows] = await db.query(
            `SELECT a.assignment_id, a.assignment_name, a.description, a.due_date, a.points_possible,
                    c.course_name
             FROM assignments a
             JOIN courses c ON a.course_id = c.course_id
             WHERE a.assignment_id = ? AND a.user_id = ?`,
            [assignmentId, req.user.userId]
        );
        if (!rows.length) return res.status(404).json({ error: 'Assignment not found.' });

        const aiOptions = await resolveAIOptions(req.user.userId);
        const summary = await summarizeAssignment(rows[0], aiOptions);
        await db.query('UPDATE assignments SET ai_summary = ? WHERE assignment_id = ?', [summary, assignmentId]);
        res.json({ summary });
    } catch (err) {
        next(err);
    }
};

module.exports = { studySchedule, urgencyAssessment, summarizeOne };
