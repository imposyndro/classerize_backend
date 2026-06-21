/**
 * lmsSyncWorker.js
 * BullMQ worker that processes jobs from the 'lms-sync' queue.
 *
 * Each job payload: { accountId: number, userId: number }
 *
 * Start this separately from the main API server:
 *   node workers/lmsSyncWorker.js
 *
 * Requires Redis (REDIS_URL in .env).
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const { Worker } = require('bullmq');
const { syncAccount } = require('../services/syncService');

const connection = {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
};

const worker = new Worker(
    'lms-sync',
    async (job) => {
        const { accountId, userId } = job.data;
        console.log(`[lms-sync] Processing account ${accountId} for user ${userId}`);

        const result = await syncAccount(accountId, userId);
        console.log(`[lms-sync] Done: ${JSON.stringify(result)}`);
        return result;
    },
    {
        connection,
        concurrency: 3,  // Process up to 3 accounts simultaneously
    }
);

worker.on('completed', (job, result) => {
    console.log(`[lms-sync] Job ${job.id} completed:`, result);
});

worker.on('failed', (job, err) => {
    console.error(`[lms-sync] Job ${job?.id} failed:`, err.message);
});

console.log('[lms-sync] Worker started. Waiting for jobs...');
