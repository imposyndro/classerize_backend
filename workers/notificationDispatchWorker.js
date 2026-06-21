/**
 * notificationDispatchWorker.js
 * Runs on a cron schedule (e.g. every 30 min) to:
 *   1. Find assignments due within each user's configured deadline_hours window
 *   2. Create DB notification records for any not yet sent
 *   3. Send emails (if email_enabled) via emailService
 *   4. Mark notifications as sent
 *
 * Start: node workers/notificationDispatchWorker.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const { Worker } = require('bullmq');
const db = require('../db');
const { sendDeadlineAlert, sendDailyDigest } = require('../services/emailService');

const connection = { url: process.env.REDIS_URL || 'redis://localhost:6379' };

const worker = new Worker(
    'notification-dispatch',
    async (job) => {
        const { type } = job.data;

        if (type === 'deadline-alerts') {
            return sendDeadlineAlerts();
        }
        if (type === 'daily-digest') {
            return sendDailyDigests();
        }
    },
    { connection, concurrency: 1 }
);

async function sendDeadlineAlerts() {
    // Get all users with email notifications enabled
    const [users] = await db.query(
        `SELECT u.user_id, u.username, u.email, np.deadline_hours, np.email_enabled
         FROM users u
         JOIN notification_preferences np ON u.user_id = np.user_id
         WHERE np.email_enabled = TRUE`
    );

    let dispatched = 0;
    for (const user of users) {
        const windowEnd = new Date(Date.now() + user.deadline_hours * 60 * 60 * 1000);

        const [assignments] = await db.query(
            `SELECT a.assignment_id, a.assignment_name, a.due_date, c.course_name
             FROM assignments a
             JOIN courses c ON a.course_id = c.course_id
             WHERE a.user_id = ?
               AND a.status = 'pending'
               AND a.due_date BETWEEN NOW() AND ?
               AND a.assignment_id NOT IN (
                   SELECT assignment_id FROM notifications
                   WHERE user_id = ? AND notification_type = 'email' AND sent = TRUE
               )`,
            [user.user_id, windowEnd, user.user_id]
        );

        for (const a of assignments) {
            try {
                await sendDeadlineAlert({
                    to: user.email,
                    username: user.username,
                    assignmentName: a.assignment_name,
                    courseName: a.course_name,
                    dueDate: a.due_date,
                });

                await db.query(
                    `INSERT INTO notifications (user_id, assignment_id, notification_type, message, notification_time, sent)
                     VALUES (?, ?, 'email', ?, NOW(), TRUE)`,
                    [user.user_id, a.assignment_id, `Reminder: "${a.assignment_name}" due soon`]
                );
                dispatched++;
            } catch (e) {
                console.error(`[notify] Failed to email user ${user.user_id}:`, e.message);
            }
        }
    }
    return { dispatched };
}

async function sendDailyDigests() {
    const [users] = await db.query(
        `SELECT u.user_id, u.username, u.email
         FROM users u
         JOIN notification_preferences np ON u.user_id = np.user_id
         WHERE np.daily_digest = TRUE AND np.email_enabled = TRUE`
    );

    let sent = 0;
    for (const user of users) {
        const [assignments] = await db.query(
            `SELECT a.assignment_name, a.due_date, c.course_name
             FROM assignments a
             JOIN courses c ON a.course_id = c.course_id
             WHERE a.user_id = ? AND a.status = 'pending' AND a.due_date > NOW()
             ORDER BY a.due_date ASC LIMIT 10`,
            [user.user_id]
        );

        try {
            await sendDailyDigest({ to: user.email, username: user.username, assignments });
            sent++;
        } catch (e) {
            console.error(`[digest] Failed for user ${user.user_id}:`, e.message);
        }
    }
    return { sent };
}

worker.on('failed', (job, err) => {
    console.error(`[notification-dispatch] Job ${job?.id} failed:`, err.message);
});

console.log('[notification-dispatch] Worker started.');
