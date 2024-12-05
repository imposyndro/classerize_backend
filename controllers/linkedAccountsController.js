const db = require('../db');

// Add a linked LMS account
const addLinkedAccount = (req, res) => {
    const { userId, lmsName, lmsUserId } = req.body;

    if (!userId || !lmsName || !lmsUserId) {
        return res.status(400).json({ message: 'Please provide all fields' });
    }

    const query = `INSERT INTO linked_accounts (user_id, lms_name, lms_user_id) VALUES (?, ?, ?)`;
    db.query(query, [userId, lmsName, lmsUserId], (error, results) => {
        if (error) {
            return res.status(500).json({ message: 'Error adding linked LMS account' });
        }
        res.status(201).json({ message: 'LMS account linked successfully', accountId: results.insertId });
    });
};

// Get all linked LMS accounts for a user
const getLinkedAccounts = (req, res) => {
    const { userId } = req.query;

    if (!userId) {
        return res.status(400).json({ message: 'User ID is required' });
    }

    const query = `SELECT * FROM linked_accounts WHERE user_id = ?`;
    db.query(query, [userId], (error, results) => {
        if (error) {
            return res.status(500).json({ message: 'Error fetching linked LMS accounts' });
        }
        res.status(200).json(results);
    });
};

module.exports = { addLinkedAccount, getLinkedAccounts };
