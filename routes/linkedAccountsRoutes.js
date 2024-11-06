const express = require('express');
const router = express.Router();
const { addLinkedAccount, getLinkedAccounts } = require('../controllers/linkedAccountsController');

// Route to add a linked LMS account
router.post('/add', addLinkedAccount);

// Route to get all linked LMS accounts for a user
router.get('/', getLinkedAccounts);

module.exports = router;
