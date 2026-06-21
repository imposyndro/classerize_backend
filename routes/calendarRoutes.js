const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/authMiddleware');
const { listEvents, createEvent, deleteEvent, exportIcal } = require('../controllers/calendarController');

// GET  /api/calendar/events          — list events (filterable by start/end/type)
// POST /api/calendar/events          — create a manual event
// DELETE /api/calendar/events/:id    — delete a manual event
// GET  /api/calendar/export.ics      — iCal export
router.get('/export.ics', verifyToken, exportIcal);
router.get('/events', verifyToken, listEvents);
router.post('/events', verifyToken, createEvent);
router.delete('/events/:id', verifyToken, deleteEvent);

module.exports = router;
