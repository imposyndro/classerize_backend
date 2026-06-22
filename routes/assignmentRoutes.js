const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/authMiddleware');
const {
    listAssignments,
    createAssignment,
    updateAssignmentStatus,
    updateProgress,
    listAssignmentsValidation,
    createAssignmentValidation,
} = require('../controllers/assignmentController');

router.get('/',                  verifyToken, listAssignmentsValidation, listAssignments);
router.post('/',                 verifyToken, createAssignmentValidation, createAssignment);
router.patch('/:id/status',      verifyToken, updateAssignmentStatus);
router.patch('/:id/progress',    verifyToken, updateProgress);

module.exports = router;
