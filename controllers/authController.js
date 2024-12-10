const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const db = require('../db');
const {findUserById} = require("../models/userModel");

const loginUser = async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await db.query(`SELECT * FROM users WHERE email = ?`, [email]);

        if (user.length === 0) {
            return res.status(404).json({ error: 'User not found.' });
        }

        const isPasswordValid = bcrypt.compareSync(password, user[0].password_hash);
        if (!isPasswordValid) {
            return res.status(401).json({ error: 'Invalid password.' });
        }

        const token = jwt.sign({ userId: user[0].user_id }, process.env.JWT_SECRET, {
            expiresIn: '7d', // Set token expiry
        });

        console.log('Generated token:', token); // Debugging
        res.status(200).json({ message: 'Login successful', token });
    } catch (error) {
        console.error('Login error:', error.message);
        res.status(500).json({ error: 'Internal server error.' });
    }
};

// Logout user
const logoutUser = (req, res) => {
    try {
        // Logic for user logout (invalidate session or token if necessary)
        res.json({ message: 'User logged out successfully' });
    } catch (error) {
        console.error('Error logging out user:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Get user profile
const getCurrentUser = async (req, res) => {
    const userId = req.user.userId;

    try {
        const [user] = await db.query('SELECT username, email FROM users WHERE user_id = ?', [userId]);

        if (!user || user.length === 0) {
            console.warn(`User not found for ID: ${userId}`); // Log a warning, not an error
            return res.status(404).json({ error: 'User not found' });
        }

        res.status(200).json({ username: user[0].username, email: user[0].email });
    } catch (error) {
        console.error('Error fetching user:', error.message); // Log errors for debugging
        res.status(500).json({ error: 'Internal server error.' });
    }
};





module.exports = {
    loginUser,
    logoutUser,
    getCurrentUser,
};
