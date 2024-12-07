const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/authMiddleware').verifyToken;
const { getCanvasCourses, getGoogleClassroomCourses } = require('../controllers/lmsController');

router.get('/courses/canvas', verifyToken, getCanvasCourses);
router.get('/courses/googleclassroom', verifyToken, getGoogleClassroomCourses);

module.exports = router;
