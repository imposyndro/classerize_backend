const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/authMiddleware');
const { saveLinkedAccount, getLinkedAccounts, linkCanvasAccount, fetchCoursesForAccount, updateAccountTitle } = require('../controllers/linkedAccountsController');

// Specific route for linking Canvas account
router.post('/auth/canvas', verifyToken, linkCanvasAccount);

// Dynamic route for other LMS platforms
router.post('/auth/:lmsName', verifyToken, saveLinkedAccount);

// Route to fetch linked accounts
router.get('/', verifyToken, getLinkedAccounts);

router.get('/accounts', async (req, res) => {
    try {
        const accounts = await db.query(
            `
            SELECT la.account_id, la.lms_name, la.lms_user_id
            FROM linked_accounts la
            LEFT JOIN courses c ON la.account_id = c.account_id
            WHERE la.user_id = ?
            `,
            [req.user.userId]
        );

        const groupedAccounts = accounts.reduce((acc, row) => {
            const { account_id, lms_name, lms_user_id, course_id, course_name } = row;

            if (!acc[account_id]) {
                acc[account_id] = {
                    accountId: account_id,
                    lmsName: lms_name,
                    lmsUserId: lms_user_id,

                };
            }

            if (course_id) {
                acc[account_id].courses.push({ courseId: course_id, courseName: course_name });
            }

            return acc;
        }, {});

        res.json(Object.values(groupedAccounts));
    } catch (error) {
        console.error('Error fetching linked accounts and courses:', error.message);
        res.status(500).json({ error: 'Failed to fetch linked accounts and courses.' });
    }
});

// Update account title
router.patch('/:accountId/update-title', updateAccountTitle);


// Fetch courses for a specific linked account
router.get("/accounts/:accountId/courses", fetchCoursesForAccount);

// Delete linked account by ID
router.delete("/:accountId", verifyToken, async (req, res) => {
    const { accountId } = req.params;

    try {
        const result = await db.query("DELETE FROM linked_accounts WHERE account_id = ? AND user_id = ?", [
            accountId,
            req.user.userId,
        ]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: "Linked account not found or not authorized to delete." });
        }

        res.status(200).json({ message: "Linked account deleted successfully." });
    } catch (error) {
        console.error("Error deleting linked account:", error.message);
        res.status(500).json({ error: "Internal server error. Please try again." });
    }
});

module.exports = router;
