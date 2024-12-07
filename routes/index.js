const express = require('express');
const app = express();
const cors = require('cors');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser'); // Added to parse cookies
require('dotenv').config();

// Middleware setup
app.use(cors({
    origin: 'http://localhost:3001', // Adjust according to your frontend's origin
    credentials: true, // Allow credentials to be included in requests
}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser()); // Added to handle cookies


// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

module.exports = app;
