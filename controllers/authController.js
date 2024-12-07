const db = require('../db');
const jwt = require('jsonwebtoken');

// Login user
const loginUser = async (req, res) => {
    const { email, password } = req.body;

    try {
        const [user] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
        if (!user || !(await bcrypt.compare(password, user.password_hash))) {
            return res.status(401).json({ error: 'Invalid email or password.' });
        }

        const token = jwt.sign(
            { userId: user.user_id },
            process.env.JWT_SECRET,
            { expiresIn: '1h' } // Token expires in 1 hour
        );

        res.cookie('token', token, {
            httpOnly: true,
            secure: false, // Set to `true` in production
            sameSite: 'strict', // Adjust for your cross-origin setup
        });

        res.status(200).json({ message: 'Login successful' });
    } catch (error) {
        console.error('Error during login:', error.message);
        res.status(500).json({ error: 'Failed to log in.' });
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
