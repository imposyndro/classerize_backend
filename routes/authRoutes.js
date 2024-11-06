const express = require('express');
const router = express.Router();
const { loginUser } = require('../controllers/authController');

// Route for user login
router.post('/login', loginUser);

module.exports = router;