const jwt = require('jsonwebtoken');
require('dotenv').config();

const verifyToken = (req, res, next) => {
    const token = req.cookies.token; // Fetch token from cookies
    console.log('Cookies:', req.cookies); // Log cookies
    console.log('Token:', token); // Log token

    if (!token) {
        console.error('Access denied: No token provided');
        return res.status(401).json({ error: 'Access denied. No token provided.' });
    }
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        console.log('Decoded Token:', decoded); // Log decoded token
        req.user = decoded;
        next();
    } catch (err) {
        console.error('JWT Error:', err.message); // Log error
        res.status(403).json({ error: 'Invalid token.' });
    }
};

module.exports = { verifyToken };
