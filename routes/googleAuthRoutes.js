const express = require('express');
const router = express.Router();
const passport = require('passport');
const jwt = require('jsonwebtoken');
const { google } = require('googleapis');
const { encrypt } = require('../utils/cryptoutils');
const db = require('../db');

// ── Google SSO (login / register) ─────────────────────────────────────────────

router.get('/google', passport.authenticate('google', {
    scope: ['profile', 'email'],
    session: false,
}));

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

// ── Google Calendar connection (separate OAuth grant) ─────────────────────────
// User must already be logged in (JWT cookie present).

const getOAuth2Client = () => new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${process.env.API_URL || 'http://localhost:5000'}/api/auth/google/calendar/callback`
);

// GET /api/auth/google/calendar — redirect to Google to grant calendar scope
router.get('/google/calendar', (req, res) => {
    // Verify the user is logged in so we can identify them in the callback
    const token = req.cookies?.token;
    if (!token) return res.redirect(`${process.env.FRONTEND_URL}/login`);

    try {
        jwt.verify(token, process.env.JWT_SECRET);
    } catch {
        return res.redirect(`${process.env.FRONTEND_URL}/login`);
    }

    const oauth2Client = getOAuth2Client();
    const url = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        prompt: 'consent',   // force refresh_token to be returned every time
        scope: [
            'https://www.googleapis.com/auth/calendar',
            'https://www.googleapis.com/auth/userinfo.email',
        ],
    });
    res.redirect(url);
});

// GET /api/auth/google/calendar/callback — Google redirects here after user approves
router.get('/google/calendar/callback', async (req, res) => {
    const { code } = req.query;
    const token = req.cookies?.token;

    if (!code || !token) {
        return res.redirect(`${process.env.FRONTEND_URL}/settings?error=calendar_auth_failed`);
    }

    let userId;
    try {
        const payload = jwt.verify(token, process.env.JWT_SECRET);
        userId = payload.userId;
    } catch {
        return res.redirect(`${process.env.FRONTEND_URL}/login`);
    }

    try {
        const oauth2Client = getOAuth2Client();
        const { tokens } = await oauth2Client.getToken(code);

        const encryptedAccess  = encrypt(tokens.access_token);
        const encryptedRefresh = tokens.refresh_token ? encrypt(tokens.refresh_token) : null;
        const expiry = tokens.expiry_date ? new Date(tokens.expiry_date) : null;

        await db.query(
            `INSERT INTO linked_accounts
                (user_id, lms_name, access_token, refresh_token, token_expiry, api_base_url, title, created_at)
             VALUES (?, 'GoogleCalendar', ?, ?, ?, 'https://www.googleapis.com', 'Google Calendar', NOW())
             ON DUPLICATE KEY UPDATE
                access_token = VALUES(access_token),
                refresh_token = COALESCE(VALUES(refresh_token), refresh_token),
                token_expiry  = VALUES(token_expiry),
                updated_at    = NOW()`,
            [userId, encryptedAccess, encryptedRefresh, expiry]
        );

        res.redirect(`${process.env.FRONTEND_URL}/settings?connected=calendar`);
    } catch (err) {
        console.error('[gcal-oauth] Callback error:', err.message);
        res.redirect(`${process.env.FRONTEND_URL}/settings?error=calendar_auth_failed`);
    }
});

module.exports = router;
