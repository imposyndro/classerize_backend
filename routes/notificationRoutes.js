const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/authMiddleware');
const { listNotifications, markRead, getPreferences, updatePreferences } = require('../controllers/notificationController');

// GET  /api/notifications                    — list notifications
// PATCH /api/notifications/:id/read         — mark one as read
// GET  /api/notifications/preferences       — get user prefs
// PUT  /api/notifications/preferences       — update user prefs
router.get('/preferences', verifyToken, getPreferences);
router.put('/preferences', verifyToken, updatePreferences);
router.get('/', verifyToken, listNotifications);
router.patch('/:id/read', verifyToken, markRead);

module.exports = router;
