const express = require('express');
const router = express.Router();
const { registerUser, registerValidation, getUserProfile } = require('../controllers/userController');
const { verifyToken } = require('../middleware/authMiddleware');

// POST /api/users/register
router.post('/register', registerValidation, registerUser);

// GET /api/users/profile
router.get('/profile', verifyToken, getUserProfile);

module.exports = router;
