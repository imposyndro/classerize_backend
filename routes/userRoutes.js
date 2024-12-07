const express = require('express');
const router = express.Router();
const { registerUser, getUserProfile } = require('../controllers/userController');
const verifyToken = require('../middleware/authMiddleware');

// Route to register a new user
router.post('/register', registerUser);

module.exports = router;
