const bcrypt = require('bcryptjs');
const db = require('../db');

// Register a new user
const registerUser = (req, res) => {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
        return res.status(400).json({ message: 'Please provide all fields' });
    }

    // Hash the password
    bcrypt.hash(password, 10, (err, hashedPassword) => {
        if (err) {
            return res.status(500).json({ message: 'Error hashing password' });
        }

        // Insert user into database
        const query = `INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)`;
        db.query(query, [username, email, hashedPassword], (error, results) => {
            if (error) {
                return res.status(500).json({ message: 'Error registering user' });
            }
            res.status(201).json({ message: 'User registered successfully', userId: results.insertId });
        });
    });
};

module.exports = { registerUser };
