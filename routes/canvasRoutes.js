const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middleware/authMiddleware");
const { linkCanvasAccount, fetchCanvasCourses } = require("../controllers/canvasController");

router.post("/auth", verifyToken, linkCanvasAccount);
router.get("/:accountId/courses", verifyToken, fetchCanvasCourses);

module.exports = router;
