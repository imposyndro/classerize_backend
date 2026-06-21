const passport = require('passport');
const { findOrCreateGoogleUser } = require('../models/userModel');

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    const GoogleStrategy = require('passport-google-oauth20').Strategy;
    passport.use(new GoogleStrategy(
        {
            clientID:     process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            callbackURL:  `${process.env.API_URL || 'http://localhost:5000'}/api/auth/google/callback`,
        },
        async (accessToken, refreshToken, profile, done) => {
            try {
                const email = profile.emails?.[0]?.value;
                if (!email) return done(new Error('No email associated with this Google account'), null);
                const user = await findOrCreateGoogleUser({
                    googleId: profile.id,
                    email,
                    username: profile.displayName || email.split('@')[0],
                });
                return done(null, user);
            } catch (err) {
                return done(err, null);
            }
        }
    ));
} else {
    console.warn('[passport] GOOGLE_CLIENT_ID not set — Google SSO disabled.');
}

module.exports = passport;
