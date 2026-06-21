/**
 * aiSummaryWorker.js
 * BullMQ worker — processes 'ai-summary' jobs.
 * Each job: { assignmentId: number }
 * Fetches the assignment, resolves user AI settings (BYOK/tier),
 * generates a summary, and writes it back to DB.
 *
 * Start: node workers/aiSummaryWorker.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const { Worker } = require('bullmq');
const db = require('../db');
const { summarizeAssignment } = require('../services/aiService');
const { resolveAIOptions } = require('../utils/resolveAIOptions');

const connection = { url: process.env.REDIS_URL || 'redis://localhost:6379' };

const worker = new Worker(
    'ai-summary',
    async (job) => {
        const { assignmentId } = job.data;

        const [rows] = await db.query(
            `SELECT a.*, c.course_name
             FROM assignments a
             JOIN courses c ON a.course_id = c.course_id
             WHERE a.assignment_id = ?`,
            [assignmentId]
        );
        if (!rows.length) return { skipped: true };

        const assignment = rows[0];
        if (assignment.ai_summary) return { skipped: true, reason: 'already summarized' };

        const aiOptions = await resolveAIOptions(assignment.user_id);
        const summary = await summarizeAssignment(assignment, aiOptions);

        await db.query(
            'UPDATE assignments SET ai_summary = ?, updated_at = NOW() WHERE assignment_id = ?',
            [summary, assignmentId]
        );

        return { assignmentId, summary };
    },
    { connection, concurrency: 5 }
);

worker.on('failed', (job, err) => {
    console.error(`[ai-summary] Job ${job?.id} failed:`, err.message);
});

console.log('[ai-summary] Worker started.');
