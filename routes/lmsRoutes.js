const express = require('express');
const router = express.Router();
const { fetchCourses } = require('../controllers/lmsController');
const { verifyToken } = require('../middleware/authMiddleware');

// Fetch courses for a linked LMS account
router.get('/courses/:lmsName', verifyToken, async (req, res) => {
    const { lmsName } = req.params;

    try {
        if (!lmsName) {
            return res.status(400).json({ error: 'LMS name is required.' });
        }

        console.log(`Fetching courses for LMS: ${lmsName}`);
        await fetchCourses(req, res);
    } catch (error) {
        console.error('Error in fetching courses:', error.message);
        res.status(500).json({ error: 'Failed to fetch courses.' });
    }
});

module.exports = router;
