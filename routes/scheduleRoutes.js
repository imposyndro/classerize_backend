const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/authMiddleware');
const { listSessions, createSession, deleteSession } = require('../controllers/scheduleController');

router.get('/',     verifyToken, listSessions);
router.post('/',    verifyToken, createSession);
router.delete('/:id', verifyToken, deleteSession);

module.exports = router;
