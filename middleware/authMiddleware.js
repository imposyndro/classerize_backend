const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
    const token = req.cookies.token;

    // Check if token is present
    if (!token) {
        console.error("No token found in cookies");
        return res.status(403).json({ message: 'A token is required for authentication' });
    }

    try {
        // Ensure JWT_SECRET is properly loaded
        if (!process.env.JWT_SECRET) {
            console.error("JWT_SECRET is not defined");
            return res.status(500).json({ message: 'Server configuration error' });
        }

        // Verify the token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        console.error('Token verification failed:', err);
        return res.status(401).json({ message: 'Invalid Token' });
    }
};

module.exports = verifyToken;
