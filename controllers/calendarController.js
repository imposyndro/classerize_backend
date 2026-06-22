const db = require('../db');
const ical = require('ical-generator');

const DAY_NAMES = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

// Expand a recurring class_session into concrete event objects for [start, end]
function expandSession(session, rangeStart, rangeEnd) {
    const events = [];
    const cur = new Date(rangeStart);
    // Advance to the first occurrence of this day_of_week
    while (cur.getDay() !== session.day_of_week) cur.setDate(cur.getDate() + 1);

    const recEnd = session.recurrence_end ? new Date(session.recurrence_end) : rangeEnd;

    while (cur <= rangeEnd && cur <= recEnd) {
        const [sh, sm] = session.start_time.split(':').map(Number);
        const [eh, em] = session.end_time.split(':').map(Number);
        const start = new Date(cur); start.setHours(sh, sm, 0, 0);
        const end   = new Date(cur); end.setHours(eh, em, 0, 0);
        events.push({
            event_id:   `class-${session.session_id}-${cur.toISOString().slice(0,10)}`,
            event_name: `${session.course_name}${session.location ? ` · ${session.location}` : ''}`,
            event_date: start.toISOString(),
            event_type: 'class',
            source:     'schedule',
            course_id:  session.course_id,
            course_name: session.course_name,
            course_code: session.course_code,
            color:       session.color,
            end_time:    end.toISOString(),
        });
        cur.setDate(cur.getDate() + 7);
    }
    return events;
}

// GET /api/calendar/events
const listEvents = async (req, res, next) => {
    const userId = req.user.userId;
    const { start, end, type } = req.query;

    const rangeStart = start ? new Date(start) : new Date(Date.now() - 30 * 864e5);
    const rangeEnd   = end   ? new Date(end)   : new Date(Date.now() + 90 * 864e5);

    const conditions = ['ce.user_id = ?'];
    const params = [userId];
    conditions.push('ce.event_date >= ?'); params.push(rangeStart);
    conditions.push('ce.event_date <= ?'); params.push(rangeEnd);
    if (type && type !== 'class') { conditions.push('ce.event_type = ?'); params.push(type); }

    try {
        const [calEvents] = await db.query(
            `SELECT ce.event_id, ce.assignment_id, ce.event_name, ce.event_date,
                    ce.event_type, ce.source, ce.created_at,
                    a.course_id, c.course_name, c.course_code, c.color
             FROM calendar_events ce
             LEFT JOIN assignments a ON ce.assignment_id = a.assignment_id
             LEFT JOIN courses c ON a.course_id = c.course_id
             WHERE ${conditions.join(' AND ')}
             ORDER BY ce.event_date ASC`,
            params
        );

        // Expand class sessions into the range (unless filtering for a specific non-class type)
        let classEvents = [];
        if (!type || type === 'class') {
            const [sessions] = await db.query(
                `SELECT s.*, c.course_name, c.course_code, c.color
                 FROM class_sessions s
                 JOIN courses c ON s.course_id = c.course_id
                 WHERE s.user_id = ?`,
                [userId]
            );
            for (const s of sessions) {
                classEvents = classEvents.concat(expandSession(s, rangeStart, rangeEnd));
            }
        }

        const allEvents = [...calEvents, ...classEvents].sort(
            (a, b) => new Date(a.event_date) - new Date(b.event_date)
        );

        res.json({ events: allEvents });
    } catch (err) {
        next(err);
    }
};

// POST /api/calendar/events — create a manual event
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
    try {
        const [result] = await db.query(
            `DELETE FROM calendar_events WHERE event_id = ? AND user_id = ? AND source = 'manual'`,
            [req.params.id, req.user.userId]
        );
        if (!result.affectedRows) return res.status(404).json({ error: 'Event not found or not deletable.' });
        res.json({ message: 'Event deleted.' });
    } catch (err) {
        next(err);
    }
};

// GET /api/calendar/workload — weekly assignment point totals for next N weeks
const workload = async (req, res, next) => {
    const userId = req.user.userId;
    const weeks  = Math.min(Number(req.query.weeks) || 8, 16);

    try {
        const [rows] = await db.query(
            `SELECT
                YEARWEEK(due_date, 1)              AS yw,
                MIN(due_date)                       AS week_start,
                SUM(points_possible)                AS total_points,
                COUNT(*)                            AS assignment_count,
                SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pending_count
             FROM assignments
             WHERE user_id = ?
               AND due_date BETWEEN NOW() AND DATE_ADD(NOW(), INTERVAL ? WEEK)
             GROUP BY yw
             ORDER BY yw`,
            [userId, weeks]
        );

        // Normalise heaviness to 0-100
        const maxPts = rows.reduce((m, r) => Math.max(m, Number(r.total_points) || 0), 1);
        const result = rows.map((r) => ({
            week_start:       r.week_start,
            total_points:     Number(r.total_points) || 0,
            assignment_count: Number(r.assignment_count),
            pending_count:    Number(r.pending_count),
            heaviness:        Math.round(((Number(r.total_points) || 0) / maxPts) * 100),
        }));

        res.json({ workload: result, weeks });
    } catch (err) {
        next(err);
    }
};

// GET /api/calendar/export.ics
const exportIcal = async (req, res, next) => {
    const userId = req.user.userId;
    try {
        const [events] = await db.query(
            `SELECT ce.event_name, ce.event_date, ce.event_type, c.course_name, c.course_code
             FROM calendar_events ce
             LEFT JOIN assignments a ON ce.assignment_id = a.assignment_id
             LEFT JOIN courses c ON a.course_id = c.course_id
             WHERE ce.user_id = ? ORDER BY ce.event_date ASC`,
            [userId]
        );

        const cal = ical.default({ name: 'Classerize — My Academic Calendar', timezone: 'UTC' });
        for (const e of events) {
            const start = new Date(e.event_date);
            cal.createEvent({
                start, end: new Date(start.getTime() + 3600000),
                summary: e.event_name,
                description: e.course_name ? `${e.course_name}${e.course_code ? ` (${e.course_code})` : ''}` : e.event_type,
            });
        }

        res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
        res.setHeader('Content-Disposition', 'attachment; filename="classerize.ics"');
        res.send(cal.toString());
    } catch (err) {
        next(err);
    }
};

module.exports = { listEvents, createEvent, deleteEvent, exportIcal, workload };
