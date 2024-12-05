require('dotenv').config(); // Load environment variables from .env
const app = require('./app'); // Import the app created in app.js

const PORT = process.env.PORT || 5000; // Use port from environment variables or default to 5000

// Start the server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
