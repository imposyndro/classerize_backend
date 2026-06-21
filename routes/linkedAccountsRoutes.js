const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/authMiddleware');
const {
    linkCanvasAccount,
    saveLinkedAccount,
    getLinkedAccounts,
    fetchCoursesForAccount,
    updateAccountTitle,
    deleteLinkedAccount,
} = require('../controllers/linkedAccountsController');

// Link a Canvas account (verifies token against Canvas API)
router.post('/auth/canvas', verifyToken, linkCanvasAccount);

// Link other LMS accounts (generic token store)
router.post('/auth/:lmsName', verifyToken, saveLinkedAccount);

// Get all linked accounts for the logged-in user
router.get('/', verifyToken, getLinkedAccounts);

// Get courses for a specific linked account
router.get('/accounts/:accountId/courses', verifyToken, fetchCoursesForAccount);

// Update display title for a linked account
router.patch('/:accountId/update-title', verifyToken, updateAccountTitle);

// Delete a linked account
router.delete('/:accountId', verifyToken, deleteLinkedAccount);

module.exports = router;
