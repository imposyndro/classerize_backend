const express = require('express');
const router = express.Router();
const multer = require('multer');
const { verifyToken } = require('../middleware/authMiddleware');
const { parse, confirm, history } = require('../controllers/syllabusController');

// In-memory upload; we hand the buffer straight to Gemini. 10 MB cap, PDF only.
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/pdf') cb(null, true);
        else cb(new Error('Only PDF files are supported.'));
    },
});

// POST /api/syllabus/parse    — upload PDF, get extracted course + assignments
// POST /api/syllabus/confirm  — bulk-create the reviewed assignments
// GET  /api/syllabus/imports  — import history
router.post('/parse', verifyToken, upload.single('syllabus'), parse);
router.post('/confirm', verifyToken, confirm);
router.get('/imports', verifyToken, history);

module.exports = router;
