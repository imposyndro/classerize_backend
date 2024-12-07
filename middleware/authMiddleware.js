const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
    const token = req.cookies?.token || req.headers['authorization']?.split(' ')[1];
    if (!token) {
        console.error('Token missing in request.');
        return res.status(401).json({ error: 'Unauthorized: Token missing.' });
    }
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        console.error('Invalid token:', error.message);
        res.status(401).json({ error: 'Unauthorized: Invalid token.' });
    }
};


module.exports = { verifyToken };
