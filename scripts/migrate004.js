require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const db = require('../db');

const run = async () => {
    // Create tables first
    await db.query(`
        CREATE TABLE IF NOT EXISTS class_sessions (
            session_id    INT AUTO_INCREMENT PRIMARY KEY,
            user_id       INT          NOT NULL,
            course_id     INT          NOT NULL,
            day_of_week   TINYINT      NOT NULL COMMENT '0=Sun 1=Mon 2=Tue 3=Wed 4=Thu 5=Fri 6=Sat',
            start_time    TIME         NOT NULL,
            end_time      TIME         NOT NULL,
            location      VARCHAR(255) NULL,
            recurrence_end DATE        NULL,
            created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id)   REFERENCES users(user_id)   ON DELETE CASCADE,
            FOREIGN KEY (course_id) REFERENCES courses(course_id) ON DELETE CASCADE
        )
    `);
    console.log('OK: class_sessions table');

    await db.query(`
        CREATE TABLE IF NOT EXISTS focus_sessions (
            focus_id        INT AUTO_INCREMENT PRIMARY KEY,
            user_id         INT NOT NULL,
            assignment_id   INT NULL,
            duration_minutes INT NOT NULL,
            completed_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id)       REFERENCES users(user_id)           ON DELETE CASCADE,
            FOREIGN KEY (assignment_id) REFERENCES assignments(assignment_id) ON DELETE SET NULL
        )
    `);
    console.log('OK: focus_sessions table');

    // ALTER columns (no IF NOT EXISTS — catch ER_DUP_FIELDNAME)
    const addCol = async (sql) => {
        try { await db.query(sql); console.log('OK:', sql.slice(0, 70)); }
        catch (e) {
            if (e.code === 'ER_DUP_FIELDNAME') console.log('Skip (exists):', sql.slice(0, 70));
            else throw e;
        }
    };

    await addCol('ALTER TABLE users ADD COLUMN onboarding_complete BOOLEAN NOT NULL DEFAULT FALSE');
    await addCol('ALTER TABLE assignments ADD COLUMN time_spent_minutes INT NOT NULL DEFAULT 0');

    console.log('\nMigration 004 complete.');
    process.exit(0);
};

run().catch((e) => { console.error(e.message); process.exit(1); });
