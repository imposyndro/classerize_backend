const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/authMiddleware');
const { saveLinkedAccount, getLinkedAccount } = require('../controllers/linkedAccountsController');

// Route to link LMS account
router.post('/auth/:lmsName', verifyToken, saveLinkedAccount);

// Route to fetch linked account details
router.get('/:lmsName', verifyToken, getLinkedAccount);

module.exports = router;
