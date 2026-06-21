const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/authMiddleware');
const { studySchedule, urgencyAssessment } = require('../controllers/aiController');

// GET /api/ai/study-schedule  — AI-generated study plan from upcoming assignments
// GET /api/ai/urgency         — AI-assessed at-risk assignments
router.get('/study-schedule', verifyToken, studySchedule);
router.get('/urgency', verifyToken, urgencyAssessment);

module.exports = router;
