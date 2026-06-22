require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const db = require('../db');

const stmts = [
    'ALTER TABLE courses ADD COLUMN color VARCHAR(7) NULL',
    'ALTER TABLE assignments ADD COLUMN progress TINYINT NOT NULL DEFAULT 0',
    'ALTER TABLE users ADD COLUMN study_streak INT NOT NULL DEFAULT 0',
    'ALTER TABLE users ADD COLUMN last_active_date DATE NULL',
    'ALTER TABLE notification_preferences ADD COLUMN grade_drop_threshold DECIMAL(5,2) NULL',
];

(async () => {
    for (const s of stmts) {
        try {
            await db.query(s);
            console.log('OK:', s.slice(0, 70));
        } catch (e) {
            if (e.code === 'ER_DUP_FIELDNAME') {
                console.log('Already exists (skip):', s.slice(0, 70));
            } else {
                console.error('ERR:', e.message);
            }
        }
    }
    console.log('Migration 003 complete.');
    process.exit(0);
})();
