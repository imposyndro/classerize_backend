const db = require('../db'); // Import the database connection
const axios = require('axios'); // For API calls
require('dotenv').config(); // Load environment variables

// Controller function to handle linking a Canvas account
const linkCanvasAccount = async (req, res) => {
    const { token } = req.body;

    if (!token) {
        return res.status(400).json({ error: 'Canvas token is required.' });
    }

    try {
        // Call the Canvas API to verify the token
        const apiBaseUrl = 'https://canvas.instructure.com';
        const response = await axios.get(`${apiBaseUrl}/api/v1/users/self`, {
            headers: { Authorization: `Bearer ${token}` },
        });

        const canvasUser = response.data; // Extract user data from the response

        // Save or update the linked account in the database
        await db.query(
            `INSERT INTO linked_accounts (user_id, lms_name, lms_user_id, access_token, api_base_url, created_at)
             VALUES (?, ?, ?, ?, ?, NOW())
             ON DUPLICATE KEY UPDATE access_token = ?, api_base_url = ?, updated_at = NOW()`,
            [
                req.user.userId, // user_id from the token
                'Canvas',        // lms_name
                canvasUser.id,   // lms_user_id
                token,           // access_token
                apiBaseUrl,      // api_base_url
                token,           // Updated access_token
                apiBaseUrl,      // Updated api_base_url
            ]
        );

        // Respond with success
        res.status(200).json({
            message: 'Canvas account linked successfully.',
            user: {
                id: canvasUser.id,
                name: canvasUser.name,
                email: canvasUser.email,
            },
        });
    } catch (error) {
        console.error('Error linking Canvas account:', error.message || error);
        res.status(500).json({
            error: 'Failed to link Canvas account. Ensure the token is valid and try again.',
        });
    }
};



// Export the controller function
module.exports = { linkCanvasAccount };
