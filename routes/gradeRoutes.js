const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/authMiddleware');
const { listGrades, gradesSummary } = require('../controllers/gradeController');

// GET /api/grades         — all grades (optionally filtered by courseId)
// GET /api/grades/summary — course-level grade rollup
router.get('/summary', verifyToken, gradesSummary);
router.get('/', verifyToken, listGrades);

module.exports = router;
