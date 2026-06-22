const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/authMiddleware');
const { search } = require('../controllers/searchController');

// GET /api/search?q=<term>
router.get('/', verifyToken, search);

module.exports = router;
