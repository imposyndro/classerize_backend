const db = require('../db');
const bcrypt = require('bcryptjs');

// Function to create a new user
const createUser = (username, email, password, callback) => {
    // Hash the password
    bcrypt.hash(password, 10, (err, hashedPassword) => {
        if (err) {
            return callback(err, null);
        }

        // Insert user into the database
        const query = `INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)`;
        db.query(query, [username, email, hashedPassword], (error, results) => {
            if (error) {
                return callback(error, null);
            }
            callback(null, results.insertId);
        });
    });
};

// Function to find a user by email
const findUserByEmail = (email, callback) => {
    const query = `SELECT * FROM users WHERE email = ?`;
    db.query(query, [email], (error, results) => {
        if (error) {
            return callback(error, null);
        }
        if (results.length === 0) {
            return callback(null, null); // No user found
        }
        callback(null, results[0]);
    });
};

// Function to find a user by ID
const findUserById = (userId, callback) => {
    const query = `SELECT * FROM users WHERE user_id = ?`;
    db.query(query, [userId], (error, results) => {
        if (error) {
            return callback(error, null);
        }
        if (results.length === 0) {
            return callback(null, null); // No user found
        }
        callback(null, results[0]);
    });
};

module.exports = {
    createUser,
    findUserByEmail,
    findUserById
};