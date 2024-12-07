const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
    const token = req.cookies?.token || req.headers.authorization?.split(' ')[1];
    if (!token) {
        return res.status(401).json({ error: 'Authorization token is missing.' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded; // Attach user info to request
        next();
    } catch (error) {
        console.error('Invalid token:', error.message);
        res.status(401).json({ error: 'Unauthorized: Invalid token.' });
    }
};

module.exports = { verifyToken };
