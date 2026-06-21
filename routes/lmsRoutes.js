const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/authMiddleware');
const { syncAccount } = require('../services/syncService');
const db = require('../db');

// POST /api/lms/sync/:accountId  — manual sync trigger for one linked account
router.post('/sync/:accountId', verifyToken, async (req, res, next) => {
    const { accountId } = req.params;
    const userId = req.user.userId;

    try {
        // Optionally enqueue via BullMQ if Redis is available, else run inline
        let result;
        if (process.env.REDIS_URL) {
            const { Queue } = require('bullmq');
            const queue = new Queue('lms-sync', {
                connection: { url: process.env.REDIS_URL },
            });
            const job = await queue.add('sync', { accountId: Number(accountId), userId });
            await queue.close();
            result = { queued: true, jobId: job.id };
        } else {
            // Inline sync (no Redis — dev mode)
            result = await syncAccount(Number(accountId), userId);
        }

        res.json({ message: 'Sync initiated.', ...result });
    } catch (err) {
        next(err);
    }
});

// POST /api/lms/sync-all  — trigger sync for all of the user's linked accounts
router.post('/sync-all', verifyToken, async (req, res, next) => {
    const userId = req.user.userId;
    try {
        const [accounts] = await db.query(
            'SELECT account_id FROM linked_accounts WHERE user_id = ?',
            [userId]
        );

        const results = await Promise.allSettled(
            accounts.map((a) => syncAccount(a.account_id, userId))
        );

        const summary = results.map((r, i) => ({
            accountId: accounts[i].account_id,
            status: r.status,
            ...(r.status === 'fulfilled' ? r.value : { error: r.reason?.message }),
        }));

        res.json({ message: 'Sync complete.', accounts: summary });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
