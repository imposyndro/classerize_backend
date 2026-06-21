/**
 * schedulers/index.js
 * Starts recurring background job producers when Redis is available.
 *
 * Jobs produced:
 *   - notification-dispatch / deadline-alerts   every 30 min
 *   - notification-dispatch / daily-digest      daily at 08:00 local time
 *   - google-calendar-sync                      every 30 min, one job per user with GoogleCalendar linked
 *
 * Call startSchedulers() once from server.js after the HTTP server starts.
 * All failures are non-fatal — logged and swallowed so the API keeps running.
 */

const { Queue } = require('bullmq');
const db = require('../db');

const THIRTY_MIN = 30 * 60 * 1000;
const ONE_HOUR   = 60 * 60 * 1000;

const startSchedulers = () => {
    if (!process.env.REDIS_URL) {
        console.log('[scheduler] REDIS_URL not set — background schedulers disabled.');
        return;
    }

    const connection = { url: process.env.REDIS_URL };
    const notifQueue = new Queue('notification-dispatch', { connection });
    const gcalQueue  = new Queue('google-calendar-sync',  { connection });

    // ── Deadline alerts — every 30 minutes ───────────────────────────────────
    const runDeadlineAlerts = async () => {
        try {
            await notifQueue.add('deadline-alerts', { type: 'deadline-alerts' });
        } catch (err) {
            console.error('[scheduler] deadline-alerts enqueue failed:', err.message);
        }
    };
    runDeadlineAlerts(); // run immediately on startup
    setInterval(runDeadlineAlerts, THIRTY_MIN);

    // ── Daily digest — once per day at 08:00 local time ──────────────────────
    let lastDigestDate = null;
    const runDailyDigestCheck = async () => {
        const now = new Date();
        const dateStr = now.toLocaleDateString();
        if (now.getHours() === 8 && lastDigestDate !== dateStr) {
            lastDigestDate = dateStr;
            try {
                await notifQueue.add('daily-digest', { type: 'daily-digest' });
                console.log('[scheduler] Daily digest enqueued.');
            } catch (err) {
                console.error('[scheduler] daily-digest enqueue failed:', err.message);
            }
        }
    };
    setInterval(runDailyDigestCheck, ONE_HOUR);

    // ── Google Calendar sync — every 30 minutes, fan out to all linked users ─
    const runGCalSync = async () => {
        try {
            const [accounts] = await db.query(
                "SELECT DISTINCT user_id FROM linked_accounts WHERE lms_name = 'GoogleCalendar'"
            );
            for (const { user_id } of accounts) {
                await gcalQueue.add('sync', { userId: user_id }, {
                    attempts: 2,
                    backoff: { type: 'fixed', delay: 10000 },
                });
            }
            if (accounts.length) {
                console.log(`[scheduler] Google Calendar sync enqueued for ${accounts.length} user(s).`);
            }
        } catch (err) {
            console.error('[scheduler] gcal-sync enqueue failed:', err.message);
        }
    };
    setInterval(runGCalSync, THIRTY_MIN);

    console.log('[scheduler] Background schedulers started (30-min intervals).');
};

module.exports = { startSchedulers };
