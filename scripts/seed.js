/**
 * scripts/seed.js
 * Creates a test user account for development / manual QA.
 *
 * Usage:
 *   node scripts/seed.js
 *
 * Requires a valid .env (copy .env.example and fill in DB_* values first).
 *
 * TEST ACCOUNT CREDENTIALS
 * ─────────────────────────
 * Username : testuser
 * Email    : test@classerize.dev
 * Password : Test1234!
 * ─────────────────────────
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const bcrypt = require('bcrypt');
const db = require('../db');

const TEST_USER = {
    username: 'testuser',
    email:    'test@classerize.dev',
    password: 'Test1234!',
};

async function seed() {
    console.log('Connecting to database…');

    const [existing] = await db.query(
        'SELECT user_id FROM users WHERE email = ?',
        [TEST_USER.email]
    );

    if (existing.length) {
        console.log(`Test user already exists (user_id=${existing[0].user_id}). Nothing to do.`);
        process.exit(0);
    }

    const hash = await bcrypt.hash(TEST_USER.password, 10);
    const [result] = await db.query(
        'INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)',
        [TEST_USER.username, TEST_USER.email, hash]
    );

    console.log(`\n✓ Test user created (user_id=${result.insertId})`);
    console.log('  Username : testuser');
    console.log('  Email    : test@classerize.dev');
    console.log('  Password : Test1234!\n');
    process.exit(0);
}

seed().catch((err) => {
    console.error('Seed failed:', err.message);
    process.exit(1);
});
