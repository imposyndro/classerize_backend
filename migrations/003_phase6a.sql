-- Migration 003: Sprint 6A quick-win features
-- Run against an existing classerize database.

USE classerize;

-- Course color coding
ALTER TABLE courses
    ADD COLUMN IF NOT EXISTS color VARCHAR(7) NULL
        COMMENT 'Hex color assigned by user, e.g. #4F46E5';

-- Assignment completion progress (0-100)
ALTER TABLE assignments
    ADD COLUMN IF NOT EXISTS progress TINYINT NOT NULL DEFAULT 0
        COMMENT 'Completion percentage 0-100; 100 auto-sets status to submitted';

-- Study streaks
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS study_streak INT NOT NULL DEFAULT 0
        COMMENT 'Consecutive days of activity',
    ADD COLUMN IF NOT EXISTS last_active_date DATE NULL
        COMMENT 'Last date activity was logged (for streak calculation)';

-- Grade drop threshold notification
ALTER TABLE notification_preferences
    ADD COLUMN IF NOT EXISTS grade_drop_threshold DECIMAL(5,2) NULL
        COMMENT 'Alert when any course grade drops below this percentage';
