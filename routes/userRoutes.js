const express = require('express');
const router = express.Router();
const { registerUser, getUserProfile } = require('../controllers/userController');

// Route for user registration
router.post('/register', registerUser);

// Route for getting user profile (requires authentication)
router.get('/profile', getUserProfile);

module.exports = router;
