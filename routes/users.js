var express = require('express');
var router = express.Router();
const verifyToken = require('../middleware/authMiddleware'); // Import middleware

// Protected route to get user listing
router.get('/', verifyToken, function(req, res, next) {
  res.send('respond with a resource');
});

module.exports = router;
