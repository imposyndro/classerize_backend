const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
require('dotenv').config();

// Login user
const loginUser = (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: 'Please provide all fields' });
    }

    // Check if user exists
    const query = `SELECT * FROM users WHERE email = ?`;
    db.query(query, [email], (error, results) => {
        if (error || results.length === 0) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        const user = results[0];

        // Compare passwords
        bcrypt.compare(password, user.password_hash, (err, isMatch) => {
            if (err || !isMatch) {
                return res.status(401).json({ message: 'Invalid email or password' });
            }

            // Generate a JWT token
            const token = jwt.sign({ userId: user.user_id }, process.env.JWT_SECRET, { expiresIn: '1h' });
            res.json({ token });
        });
    });
};

module.exports = { loginUser };
