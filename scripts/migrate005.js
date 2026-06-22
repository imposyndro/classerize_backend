require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const db = require('../db');

const run = async () => {
    // ── Flashcard decks ──────────────────────────────────────────────────────
    await db.query(`
        CREATE TABLE IF NOT EXISTS flashcard_decks (
            deck_id     INT AUTO_INCREMENT PRIMARY KEY,
            user_id     INT          NOT NULL,
            course_id   INT          NULL,
            title       VARCHAR(255) NOT NULL,
            description TEXT         NULL,
            source      VARCHAR(20)  NOT NULL DEFAULT 'manual' COMMENT 'manual | ai',
            created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id)   REFERENCES users(user_id)     ON DELETE CASCADE,
            FOREIGN KEY (course_id) REFERENCES courses(course_id) ON DELETE SET NULL
        )
    `);
    console.log('OK: flashcard_decks table');

    // ── Flashcards (with SM-2 spaced-repetition fields) ──────────────────────
    await db.query(`
        CREATE TABLE IF NOT EXISTS flashcards (
            card_id          INT AUTO_INCREMENT PRIMARY KEY,
            deck_id          INT          NOT NULL,
            user_id          INT          NOT NULL,
            front            TEXT         NOT NULL,
            back             TEXT         NOT NULL,
            ease_factor      DECIMAL(4,2) NOT NULL DEFAULT 2.50,
            interval_days    INT          NOT NULL DEFAULT 0,
            repetitions      INT          NOT NULL DEFAULT 0,
            due_date         DATE         NOT NULL DEFAULT (CURRENT_DATE),
            last_reviewed_at TIMESTAMP    NULL,
            created_at       TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (deck_id) REFERENCES flashcard_decks(deck_id) ON DELETE CASCADE,
            FOREIGN KEY (user_id) REFERENCES users(user_id)           ON DELETE CASCADE,
            INDEX idx_due (user_id, due_date)
        )
    `);
    console.log('OK: flashcards table');

    // ── Syllabus import history ──────────────────────────────────────────────
    await db.query(`
        CREATE TABLE IF NOT EXISTS syllabus_imports (
            import_id     INT AUTO_INCREMENT PRIMARY KEY,
            user_id       INT          NOT NULL,
            course_id     INT          NULL,
            filename      VARCHAR(255) NULL,
            items_created INT          NOT NULL DEFAULT 0,
            status        VARCHAR(20)  NOT NULL DEFAULT 'parsed' COMMENT 'parsed | confirmed',
            created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id)   REFERENCES users(user_id)     ON DELETE CASCADE,
            FOREIGN KEY (course_id) REFERENCES courses(course_id) ON DELETE SET NULL
        )
    `);
    console.log('OK: syllabus_imports table');

    console.log('\nMigration 005 complete.');
    process.exit(0);
};

run().catch((e) => { console.error(e.message); process.exit(1); });
