const express = require('express');
const router = express.Router();
const passport = require('passport');
const jwt = require('jsonwebtoken');

// GET /api/auth/google — kicks off OAuth2 flow
router.get('/google', passport.authenticate('google', {
    scope: ['profile', 'email'],
    session: false,
}));

// GET /api/auth/google/callback — Google redirects here after user approves
router.get('/google/callback',
    passport.authenticate('google', { session: false, failureRedirect: `${process.env.FRONTEND_URL}/login?error=google_auth_failed` }),
    (req, res) => {
        const token = jwt.sign({ userId: req.user.user_id }, process.env.JWT_SECRET, { expiresIn: '1h' });

        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
            maxAge: 3600000,
        });

        res.redirect(`${process.env.FRONTEND_URL}/dashboard`);
    }
);

module.exports = router;
