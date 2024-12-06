const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
    const token = req.cookies.token; // Ensure cookies middleware is used

    if (!token) {
        console.error('No token found in cookies');
        return res.status(403).json({ message: 'A token is required for authentication' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        console.error('Token verification failed:', err.message);
        return res.status(401).json({ message: 'Invalid Token' });
    }
};

module.exports = verifyToken;
