require('dotenv').config();

// app.js
const express = require('express');
const cors = require('cors');
const mysql = require("mysql2/promise");
const cookieParser = require('cookie-parser');
const app = express();

// Middleware
app.use(express.json());
app.use(cookieParser());

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3001';

app.use(cors({
    origin: FRONTEND_URL,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));


// Import routes
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const lmsRoutes = require('./routes/lmsRoutes');
const linkedAccountsRoutes = require('./routes/linkedAccountsRoutes');


// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/lms', lmsRoutes)
app.use('/api/linked-accounts', linkedAccountsRoutes);


// Export app
module.exports = app;
