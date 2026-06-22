const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/authMiddleware');
const { logSession, getStats } = require('../controllers/focusController');

router.post('/sessions', verifyToken, logSession);
router.get('/stats',     verifyToken, getStats);

module.exports = router;
