const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/authMiddleware');
const { saveLinkedAccount, getLinkedAccounts, linkCanvasAccount} = require('../controllers/linkedAccountsController');

// Route to link LMS account
router.post('/auth/:lmsName', verifyToken, saveLinkedAccount);

// Route to fetch linked accounts
router.get('/', verifyToken, getLinkedAccounts);

router.post('/auth/canvas', verifyToken, linkCanvasAccount);

module.exports = router;
