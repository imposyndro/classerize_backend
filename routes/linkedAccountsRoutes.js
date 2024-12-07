const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/authMiddleware').verifyToken;
const { saveLinkedAccount, getLinkedAccount } = require('../controllers/linkedAccountsController');

router.post('/auth/:lmsName', verifyToken, saveLinkedAccount);
router.get('/auth/:lmsName', verifyToken, getLinkedAccount);

module.exports = router;
