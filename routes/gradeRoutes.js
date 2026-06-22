const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/authMiddleware');
const { listGrades, gradesSummary, gradeTrend, whatIf } = require('../controllers/gradeController');

router.get('/summary',           verifyToken, gradesSummary);
router.get('/trend/:courseId',   verifyToken, gradeTrend);
router.post('/whatif',           verifyToken, whatIf);
router.get('/',                  verifyToken, listGrades);

module.exports = router;
