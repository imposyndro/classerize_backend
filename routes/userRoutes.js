const express = require('express');
const router = express.Router();
const { registerUser, registerValidation, getUserProfile, getAISettings, updateAISettings, pingStreak, completeOnboarding } = require('../controllers/userController');
const { verifyToken } = require('../middleware/authMiddleware');

// POST /api/users/register
router.post('/register', registerValidation, registerUser);

// GET /api/users/profile
router.get('/profile', verifyToken, getUserProfile);

// GET  /api/users/ai-settings  — return tier, BYOK key presence, model preference
// PATCH /api/users/ai-settings  — update BYOK key and/or model
router.get('/ai-settings',  verifyToken, getAISettings);
router.patch('/ai-settings', verifyToken, updateAISettings);
router.post('/ping',         verifyToken, pingStreak);
router.patch('/onboarding',  verifyToken, completeOnboarding);

module.exports = router;
