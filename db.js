// backend/config/db.js
const mysql = require('mysql2');
require('dotenv').config();

// Create a MySQL connection pool for better efficiency
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: 3306, // Use the default MySQL port
    waitForConnections: true,
    connectionLimit: 10, // Set the connection limit to manage concurrent requests
    queueLimit: 0,
});

module.exports = pool.promise(); // Export the pool as a promise to use async/await
