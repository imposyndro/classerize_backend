const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const db = require('../db');

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

module.exports = { loginUser };





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
const getProfile = async (req, res) => {
    try {
        const userId = req.user.userId;

        // Fetch user profile
        const user = await db.query('SELECT username, email FROM users WHERE user_id = ?', [userId]);

        if (user.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({ profile: user[0] });
    } catch (error) {
        console.error('Error fetching profile:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

module.exports = {
    loginUser,
    logoutUser,
    getProfile,
};
