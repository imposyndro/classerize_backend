const db = require('../db');
const { generateStudySchedule, assessUrgency } = require('../services/aiService');

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

        const schedule = await generateStudySchedule(assignments);
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

        const urgency = await assessUrgency(assignments);
        res.json({ urgency });
    } catch (err) {
        next(err);
    }
};

module.exports = { studySchedule, urgencyAssessment };
