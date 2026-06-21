/**
 * googleCalendarSyncWorker.js
 * BullMQ worker that pushes/updates Classerize assignment due dates
 * into users' Google Calendars every 30 minutes.
 *
 * Job payload: { userId: number }
 * Start: node workers/googleCalendarSyncWorker.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const { Worker, Queue } = require('bullmq');
const db = require('../db');
const { decrypt } = require('../utils/cryptoUtils');
const GoogleCalendarService = require('../services/googleCalendarService');

const connection = { url: process.env.REDIS_URL || 'redis://localhost:6379' };

const worker = new Worker(
    'google-calendar-sync',
    async (job) => {
        const { userId } = job.data;

        // Get user's Google-linked account (SSO users have google_id)
        const [users] = await db.query(
            'SELECT google_id FROM users WHERE user_id = ? AND google_id IS NOT NULL',
            [userId]
        );
        if (!users.length) return { skipped: true, reason: 'No Google account linked' };

        // Get user's Google access token (stored via OAuth in linked_accounts with lms_name='GoogleCalendar')
        const [googleAccounts] = await db.query(
            "SELECT * FROM linked_accounts WHERE user_id = ? AND lms_name = 'GoogleCalendar'",
            [userId]
        );
        if (!googleAccounts.length) return { skipped: true, reason: 'Google Calendar not connected' };

        const acct = googleAccounts[0];
        const accessToken  = decrypt(acct.access_token);
        const refreshToken = acct.refresh_token ? decrypt(acct.refresh_token) : null;

        const gcal = new GoogleCalendarService(accessToken, refreshToken);

        // Get all upcoming assignments for this user without a Google Calendar external_id
        const [pendingEvents] = await db.query(
            `SELECT ce.event_id, ce.event_name, ce.event_date, ce.external_id,
                    c.course_name
             FROM calendar_events ce
             LEFT JOIN assignments a ON ce.assignment_id = a.assignment_id
             LEFT JOIN courses c ON a.course_id = c.course_id
             WHERE ce.user_id = ? AND ce.event_date > NOW()
             ORDER BY ce.event_date ASC
             LIMIT 100`,
            [userId]
        );

        let created = 0, updated = 0;
        for (const ev of pendingEvents) {
            const payload = {
                summary: ev.event_name,
                description: ev.course_name ? `Course: ${ev.course_name}` : 'Classerize assignment',
                dueDate: ev.event_date,
            };

            try {
                if (ev.external_id) {
                    await gcal.updateEvent(ev.external_id, payload);
                    updated++;
                } else {
                    const googleEventId = await gcal.createEvent(payload);
                    await db.query(
                        'UPDATE calendar_events SET external_id = ? WHERE event_id = ?',
                        [googleEventId, ev.event_id]
                    );
                    created++;
                }
            } catch (e) {
                console.warn(`[gcal-sync] Skipping event ${ev.event_id}: ${e.message}`);
            }
        }

        return { created, updated };
    },
    { connection, concurrency: 2 }
);

worker.on('completed', (job, result) => {
    console.log(`[gcal-sync] Job ${job.id} done:`, result);
});

worker.on('failed', (job, err) => {
    console.error(`[gcal-sync] Job ${job?.id} failed:`, err.message);
});

console.log('[gcal-sync] Worker started.');
