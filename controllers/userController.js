const db = require('../db');
const bcrypt = require('bcrypt');


// Register a new user
const registerUser = async (req, res) => {
    const { username, email, password } = req.body;

    // Define strong password policy
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(password)) {
        return res.status(400).json({
            error: 'Password must be at least 8 characters long, include one uppercase letter, one lowercase letter, one number, and one special character.',
        });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10); // Hash the password
        const [result] = await db.query(
            'INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)',
            [username, email, hashedPassword]
        );

        res.status(201).json({ message: 'User registered successfully', userId: result.insertId });
    } catch (error) {
        console.error('Error registering user:', error);
        res.status(500).json({ error: 'Failed to register user' });
    }
};

// Get user profile
const getUserProfile = async (req, res) => {
    try {
        const [rows] = await db.query(
            'SELECT username, email, created_at FROM users WHERE user_id = ?',
            [req.user.userId]
        );

        if (rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json(rows[0]);
    } catch (error) {
        console.error('Error fetching user profile:', error);
        res.status(500).json({ error: 'Database error' });
    }
};

module.exports = {
    registerUser,
    getUserProfile,
};
