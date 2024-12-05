// backend/testConnection.js
const db = require('./db'); // Import your db.js file

(async () => {
    try {
        // Execute a simple query to test the connection
        await db.query('SELECT 1');
        console.log('Connection to MySQL database is successful');
        process.exit(0);
    } catch (error) {
        console.error('Unable to connect to MySQL database:', error.message);
        process.exit(1);
    }
})();
