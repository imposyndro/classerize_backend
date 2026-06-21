const db = require('../db');
const ical = require('ical-generator');

// GET /api/calendar/events
const listEvents = async (req, res, next) => {
    const userId = req.user.userId;
    const { start, end, type } = req.query;

    const conditions = ['ce.user_id = ?'];
    const params = [userId];
    if (start) { conditions.push('ce.event_date >= ?'); params.push(new Date(start)); }
    if (end)   { conditions.push('ce.event_date <= ?'); params.push(new Date(end)); }
    if (type)  { conditions.push('ce.event_type = ?');  params.push(type); }

    try {
        const [events] = await db.query(
            `SELECT ce.event_id, ce.assignment_id, ce.event_name, ce.event_date,
                    ce.event_type, ce.source, ce.created_at,
                    a.course_id, c.course_name, c.course_code
             FROM calendar_events ce
             LEFT JOIN assignments a ON ce.assignment_id = a.assignment_id
             LEFT JOIN courses c ON a.course_id = c.course_id
             WHERE ${conditions.join(' AND ')}
             ORDER BY ce.event_date ASC`,
            params
        );
        res.json({ events });
    } catch (err) {
        next(err);
    }
};

// POST /api/calendar/events  — create a manual event
const createEvent = async (req, res, next) => {
    const { event_name, event_date, event_type = 'custom' } = req.body;

    if (!event_name || !event_date) {
        return res.status(400).json({ error: 'event_name and event_date are required.' });
    }

    try {
        const [result] = await db.query(
            `INSERT INTO calendar_events (user_id, event_name, event_date, event_type, source)
             VALUES (?, ?, ?, ?, 'manual')`,
            [req.user.userId, event_name, new Date(event_date), event_type]
        );
        res.status(201).json({ message: 'Event created.', eventId: result.insertId });
    } catch (err) {
        next(err);
    }
};

// DELETE /api/calendar/events/:id
const deleteEvent = async (req, res, next) => {
    const { id } = req.params;
    try {
        const [result] = await db.query(
            `DELETE FROM calendar_events
             WHERE event_id = ? AND user_id = ? AND source = 'manual'`,
            [id, req.user.userId]
        );
        if (!result.affectedRows) {
            return res.status(404).json({ error: 'Event not found or not deletable (LMS-sourced events cannot be manually deleted).' });
        }
        res.json({ message: 'Event deleted.' });
    } catch (err) {
        next(err);
    }
};

// GET /api/calendar/export.ics  — iCal feed for all user's events
const exportIcal = async (req, res, next) => {
    const userId = req.user.userId;
    try {
        const [events] = await db.query(
            `SELECT ce.event_name, ce.event_date, ce.event_type,
                    c.course_name, c.course_code
             FROM calendar_events ce
             LEFT JOIN assignments a ON ce.assignment_id = a.assignment_id
             LEFT JOIN courses c ON a.course_id = c.course_id
             WHERE ce.user_id = ?
             ORDER BY ce.event_date ASC`,
            [userId]
        );

        const cal = ical.default({
            name: 'Classerize — My Academic Calendar',
            timezone: 'UTC',
        });

        for (const event of events) {
            const start = new Date(event.event_date);
            cal.createEvent({
                start,
                end: new Date(start.getTime() + 60 * 60 * 1000), // 1-hour block
                summary: event.event_name,
                description: event.course_name
                    ? `${event.course_name}${event.course_code ? ` (${event.course_code})` : ''}`
                    : event.event_type,
            });
        }

        res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
        res.setHeader('Content-Disposition', 'attachment; filename="classerize.ics"');
        res.send(cal.toString());
    } catch (err) {
        next(err);
    }
};

module.exports = { listEvents, createEvent, deleteEvent, exportIcal };
