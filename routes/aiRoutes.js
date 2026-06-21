const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/authMiddleware');
const { studySchedule, urgencyAssessment, summarizeOne } = require('../controllers/aiController');

// GET  /api/ai/study-schedule              — AI-generated study plan from upcoming assignments
// GET  /api/ai/urgency                     — AI-assessed at-risk assignments
// POST /api/ai/summarize/:assignmentId     — sync per-assignment summary (no queue needed)
router.get('/study-schedule', verifyToken, studySchedule);
router.get('/urgency', verifyToken, urgencyAssessment);
router.post('/summarize/:assignmentId', verifyToken, summarizeOne);

module.exports = router;
