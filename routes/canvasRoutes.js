const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middleware/authMiddleware");
const { linkCanvasAccount } = require("../controllers/canvasController");

router.post("/auth", verifyToken, linkCanvasAccount);
// Route to fetch courses from Canvas using personal access token
router.get("/:accountId/courses", verifyToken, async (req, res) => {
    const { accountId } = req.params;

    try {
        // Fetch the linked account from the database
        const [account] = await db.query("SELECT * FROM linked_accounts WHERE account_id = ?", [accountId]);

        if (!account) {
            return res.status(404).json({ error: "Linked account not found." });
        }

        const { access_token, api_base_url } = account;

        // Use access_token to make a request to Canvas API
        const response = await fetch(`${api_base_url}/api/v1/courses`, {
            headers: {
                Authorization: `Bearer ${access_token}`,
            },
        });

        if (!response.ok) {
            throw new Error("Failed to fetch courses from Canvas.");
        }

        const courses = await response.json();
        res.json({ courses });
    } catch (error) {
        console.error("Error fetching Canvas courses:", error.message);
        res.status(500).json({ error: "Failed to fetch courses from Canvas." });
    }
});

module.exports = router;
