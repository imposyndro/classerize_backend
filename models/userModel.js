const db = require('../db');
const bcrypt = require('bcryptjs');

const createUser = async (username, email, password) => {
    const hashedPassword = await bcrypt.hash(password, 10);
    const [result] = await db.query(
        'INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)',
        [username, email, hashedPassword]
    );
    return result.insertId;
};

const findUserByEmail = async (email) => {
    const [rows] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    return rows[0] || null;
};

const findUserById = async (userId) => {
    const [rows] = await db.query('SELECT * FROM users WHERE user_id = ?', [userId]);
    return rows[0] || null;
};

const findOrCreateGoogleUser = async ({ googleId, email, username }) => {
    const [rows] = await db.query('SELECT * FROM users WHERE google_id = ? OR email = ?', [googleId, email]);
    if (rows[0]) {
        // If user exists but doesn't have google_id yet, attach it
        if (!rows[0].google_id) {
            await db.query('UPDATE users SET google_id = ? WHERE user_id = ?', [googleId, rows[0].user_id]);
        }
        return rows[0];
    }
    // New Google user — no password required
    const [result] = await db.query(
        'INSERT INTO users (username, email, google_id) VALUES (?, ?, ?)',
        [username, email, googleId]
    );
    const [newRows] = await db.query('SELECT * FROM users WHERE user_id = ?', [result.insertId]);
    return newRows[0];
};

module.exports = { createUser, findUserByEmail, findUserById, findOrCreateGoogleUser };
