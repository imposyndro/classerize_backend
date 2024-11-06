const express = require('express');
const dotenv = require('dotenv');
const db = require('./config/db');

dotenv.config();
const app = express();
const PORT = process.env.PORT || 5000;


// Middleware
app.use(express.json());

// Import routes
const userRoutes = require('./routes/userRoutes');
const authRoutes = require('./routes/authRoutes');
const linkedAccountsRoutes = require('./routes/linkedAccountsRoutes');

// Define routes
app.use('/api/users', userRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/linked-accounts', linkedAccountsRoutes);

// Start server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});