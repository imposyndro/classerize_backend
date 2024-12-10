// backend/config/db.js
const mysql = require('mysql2/promise');
require('dotenv').config();

// Create a MySQL connection pool for better efficiency
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
});

module.exports = pool; // Export the pool as a promise to use async/await
