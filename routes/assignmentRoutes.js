const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/authMiddleware');
const {
    listAssignments,
    updateAssignmentStatus,
    listAssignmentsValidation,
} = require('../controllers/assignmentController');

// GET  /api/assignments          — paginated, filterable list
// PATCH /api/assignments/:id/status — mark pending/submitted/completed/excused
router.get('/', verifyToken, listAssignmentsValidation, listAssignments);
router.patch('/:id/status', verifyToken, updateAssignmentStatus);

module.exports = router;
