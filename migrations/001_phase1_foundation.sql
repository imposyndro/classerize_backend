-- Migration 001: Phase 1 Foundation
-- Safe to run on existing classerize DB (uses IF NOT EXISTS / IF EXISTS guards)

USE classerize;

-- Add google_id to users (Google SSO)
ALTER TABLE users
    MODIFY COLUMN password_hash VARCHAR(255) NULL,
    ADD COLUMN IF NOT EXISTS google_id VARCHAR(100) NULL UNIQUE AFTER password_hash;

-- Add updated_at, last_synced to linked_accounts
ALTER TABLE linked_accounts
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NULL ON UPDATE CURRENT_TIMESTAMP AFTER created_at,
    ADD COLUMN IF NOT EXISTS last_synced DATETIME NULL AFTER title,
    MODIFY COLUMN lms_user_id VARCHAR(100) NULL,
    MODIFY COLUMN api_base_url VARCHAR(255) NOT NULL DEFAULT '';

-- Fix unique constraint: allow same LMS at different institutions
-- Drop old index if it exists (won't error if absent in MySQL 8+)
DROP INDEX IF EXISTS idx_user_lms ON linked_accounts;
-- Only add if not already there
ALTER TABLE linked_accounts
    ADD CONSTRAINT uq_user_lms_url UNIQUE (user_id, lms_name, api_base_url);

-- Add course_code, time_zone, calendar_ics_url to courses
ALTER TABLE courses
    ADD COLUMN IF NOT EXISTS course_code VARCHAR(50) NULL AFTER course_name,
    ADD COLUMN IF NOT EXISTS time_zone VARCHAR(50) NULL AFTER end_date,
    ADD COLUMN IF NOT EXISTS calendar_ics_url VARCHAR(512) NULL AFTER time_zone,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NULL ON UPDATE CURRENT_TIMESTAMP AFTER created_at,
    MODIFY COLUMN institution_name VARCHAR(150) NULL;

-- Add user_id, points_possible, submission_type, ai_summary, updated_at to assignments
ALTER TABLE assignments
    ADD COLUMN IF NOT EXISTS user_id INT NULL AFTER course_id,
    ADD COLUMN IF NOT EXISTS points_possible DECIMAL(8,2) NULL AFTER description,
    ADD COLUMN IF NOT EXISTS submission_type VARCHAR(100) NULL AFTER points_possible,
    ADD COLUMN IF NOT EXISTS ai_summary TEXT NULL AFTER submission_type,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NULL ON UPDATE CURRENT_TIMESTAMP AFTER created_at;

-- Backfill user_id on assignments from courses table
UPDATE assignments a
    JOIN courses c ON a.course_id = c.course_id
    SET a.user_id = c.user_id
    WHERE a.user_id IS NULL;

-- Make user_id NOT NULL after backfill
ALTER TABLE assignments MODIFY COLUMN user_id INT NOT NULL;

-- Add FK if not already there
ALTER TABLE assignments
    ADD CONSTRAINT IF NOT EXISTS fk_assignments_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE;

-- Add unique constraint to prevent duplicate assignment syncs
ALTER TABLE assignments
    ADD CONSTRAINT IF NOT EXISTS uq_course_assignment UNIQUE (course_id, lms_assignment_id);

-- Grades table (new)
CREATE TABLE IF NOT EXISTS grades (
    grade_id        INT AUTO_INCREMENT PRIMARY KEY,
    user_id         INT          NOT NULL,
    course_id       INT          NOT NULL,
    assignment_id   INT          NULL,
    score           DECIMAL(8,2) NULL,
    points_possible DECIMAL(8,2) NULL,
    grade_percent   DECIMAL(5,2) NULL,
    letter_grade    VARCHAR(5)   NULL,
    submitted_at    DATETIME     NULL,
    graded_at       DATETIME     NULL,
    created_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP    NULL ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id)       REFERENCES users(user_id)             ON DELETE CASCADE,
    FOREIGN KEY (course_id)     REFERENCES courses(course_id)         ON DELETE CASCADE,
    FOREIGN KEY (assignment_id) REFERENCES assignments(assignment_id) ON DELETE SET NULL
);

-- Calendar events: add assignment_id, source, external_id
ALTER TABLE calendar_events
    ADD COLUMN IF NOT EXISTS assignment_id INT NULL AFTER user_id,
    ADD COLUMN IF NOT EXISTS source VARCHAR(50) NULL AFTER event_type,
    ADD COLUMN IF NOT EXISTS external_id VARCHAR(255) NULL AFTER source,
    MODIFY COLUMN event_type VARCHAR(50) NOT NULL DEFAULT 'assignment';

ALTER TABLE calendar_events
    ADD CONSTRAINT IF NOT EXISTS fk_cal_assignment FOREIGN KEY (assignment_id) REFERENCES assignments(assignment_id) ON DELETE SET NULL;

-- Notification preferences table (new)
CREATE TABLE IF NOT EXISTS notification_preferences (
    pref_id          INT AUTO_INCREMENT PRIMARY KEY,
    user_id          INT         NOT NULL UNIQUE,
    email_enabled    BOOLEAN     NOT NULL DEFAULT TRUE,
    web_enabled      BOOLEAN     NOT NULL DEFAULT TRUE,
    daily_digest     BOOLEAN     NOT NULL DEFAULT TRUE,
    deadline_hours   INT         NOT NULL DEFAULT 24,
    created_at       TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at       TIMESTAMP   NULL ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Notifications: add message, read_at; relax assignment_id to nullable
ALTER TABLE notifications
    ADD COLUMN IF NOT EXISTS message TEXT NULL AFTER notification_type,
    ADD COLUMN IF NOT EXISTS read_at DATETIME NULL AFTER sent,
    MODIFY COLUMN assignment_id INT NULL;
