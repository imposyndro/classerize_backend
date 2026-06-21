-- Classerize Database Schema
-- Run this to create a fresh database. For migrations on an existing DB, use migrations/001_phase1.sql

DROP DATABASE IF EXISTS classerize;
CREATE DATABASE classerize CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE classerize;

-- ── Users ─────────────────────────────────────────────────────────────────────
CREATE TABLE users (
    user_id        INT AUTO_INCREMENT PRIMARY KEY,
    username       VARCHAR(50)  NOT NULL UNIQUE,
    email          VARCHAR(100) NOT NULL UNIQUE,
    password_hash  VARCHAR(255) NULL,              -- NULL for Google SSO-only accounts
    google_id      VARCHAR(100) NULL UNIQUE,       -- Google OAuth subject ID
    role              VARCHAR(50)  NOT NULL DEFAULT 'user',
    subscription_tier ENUM('free','pro') NOT NULL DEFAULT 'free',
    gemini_api_key    VARCHAR(512) NULL COMMENT 'AES-256-CBC encrypted BYOK key',
    ai_model          VARCHAR(100) NULL COMMENT 'Preferred model when using BYOK key',
    created_at        TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at        TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ── Linked LMS Accounts ───────────────────────────────────────────────────────
CREATE TABLE linked_accounts (
    account_id    INT AUTO_INCREMENT PRIMARY KEY,
    user_id       INT          NOT NULL,
    lms_name      VARCHAR(50)  NOT NULL,           -- 'Canvas', 'Blackboard', 'GoogleClassroom', 'Moodle'
    lms_user_id   VARCHAR(100) NULL,               -- User's ID within that LMS
    access_token  VARCHAR(512) NOT NULL,           -- AES-256-CBC encrypted
    refresh_token VARCHAR(512) NULL,               -- For OAuth2-based LMS (Phase 4)
    token_expiry  DATETIME     NULL,
    api_base_url  VARCHAR(255) NOT NULL,
    title         VARCHAR(255) NULL,               -- User-defined display name
    last_synced   DATETIME     NULL,               -- Populated by sync worker (Phase 2)
    created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMP    NULL ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    -- A user can have Canvas at two different institutions → include api_base_url in key
    UNIQUE KEY uq_user_lms_url (user_id, lms_name, api_base_url)
);

-- ── Courses ───────────────────────────────────────────────────────────────────
CREATE TABLE courses (
    course_id        INT AUTO_INCREMENT PRIMARY KEY,
    user_id          INT          NOT NULL,
    account_id       INT          NOT NULL,
    lms_course_id    VARCHAR(100) NOT NULL,
    course_name      VARCHAR(255) NOT NULL,
    course_code      VARCHAR(50)  NULL,
    institution_name VARCHAR(150) NULL,
    start_date       DATE         NULL,
    end_date         DATE         NULL,
    time_zone        VARCHAR(50)  NULL,
    calendar_ics_url VARCHAR(512) NULL,
    created_at       TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at       TIMESTAMP    NULL ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id)    REFERENCES users(user_id)          ON DELETE CASCADE,
    FOREIGN KEY (account_id) REFERENCES linked_accounts(account_id) ON DELETE CASCADE,
    UNIQUE KEY uq_account_course (account_id, lms_course_id)
);

-- ── Assignments ───────────────────────────────────────────────────────────────
CREATE TABLE assignments (
    assignment_id    INT AUTO_INCREMENT PRIMARY KEY,
    course_id        INT          NOT NULL,
    user_id          INT          NOT NULL,
    lms_assignment_id VARCHAR(100) NOT NULL,
    assignment_name  VARCHAR(255) NOT NULL,
    due_date         DATETIME     NULL,
    description      TEXT         NULL,
    points_possible  DECIMAL(8,2) NULL,
    status           VARCHAR(50)  NOT NULL DEFAULT 'pending', -- pending, submitted, graded, excused
    submission_type  VARCHAR(100) NULL,
    ai_summary       TEXT         NULL,                        -- Populated by AI worker (Phase 5)
    created_at       TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at       TIMESTAMP    NULL ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (course_id) REFERENCES courses(course_id) ON DELETE CASCADE,
    FOREIGN KEY (user_id)   REFERENCES users(user_id)    ON DELETE CASCADE,
    UNIQUE KEY uq_course_assignment (course_id, lms_assignment_id)
);

-- ── Grades ────────────────────────────────────────────────────────────────────
CREATE TABLE grades (
    grade_id        INT AUTO_INCREMENT PRIMARY KEY,
    user_id         INT          NOT NULL,
    course_id       INT          NOT NULL,
    assignment_id   INT          NULL,              -- NULL = course-level grade
    score           DECIMAL(8,2) NULL,
    points_possible DECIMAL(8,2) NULL,
    grade_percent   DECIMAL(5,2) NULL,             -- Pre-computed percentage
    letter_grade    VARCHAR(5)   NULL,
    submitted_at    DATETIME     NULL,
    graded_at       DATETIME     NULL,
    created_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP    NULL ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id)       REFERENCES users(user_id)           ON DELETE CASCADE,
    FOREIGN KEY (course_id)     REFERENCES courses(course_id)       ON DELETE CASCADE,
    FOREIGN KEY (assignment_id) REFERENCES assignments(assignment_id) ON DELETE SET NULL
);

-- ── Calendar Events ───────────────────────────────────────────────────────────
CREATE TABLE calendar_events (
    event_id       INT AUTO_INCREMENT PRIMARY KEY,
    user_id        INT          NOT NULL,
    assignment_id  INT          NULL,              -- Linked assignment (if sourced from LMS)
    event_name     VARCHAR(255) NOT NULL,
    event_date     DATETIME     NOT NULL,
    event_type     VARCHAR(50)  NOT NULL DEFAULT 'assignment', -- assignment, class, custom
    source         VARCHAR(50)  NULL,              -- 'canvas', 'google_calendar', 'manual'
    external_id    VARCHAR(255) NULL,              -- Google Calendar event ID (Phase 4)
    created_at     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id)      REFERENCES users(user_id)           ON DELETE CASCADE,
    FOREIGN KEY (assignment_id) REFERENCES assignments(assignment_id) ON DELETE SET NULL
);

-- ── Notification Preferences ─────────────────────────────────────────────────
CREATE TABLE notification_preferences (
    pref_id          INT AUTO_INCREMENT PRIMARY KEY,
    user_id          INT         NOT NULL UNIQUE,
    email_enabled    BOOLEAN     NOT NULL DEFAULT TRUE,
    web_enabled      BOOLEAN     NOT NULL DEFAULT TRUE,
    daily_digest     BOOLEAN     NOT NULL DEFAULT TRUE,
    deadline_hours   INT         NOT NULL DEFAULT 24,  -- Alert N hours before due date
    created_at       TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at       TIMESTAMP   NULL ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- ── Notifications ─────────────────────────────────────────────────────────────
CREATE TABLE notifications (
    notification_id   INT AUTO_INCREMENT PRIMARY KEY,
    user_id           INT          NOT NULL,
    assignment_id     INT          NULL,
    notification_type VARCHAR(50)  NOT NULL,   -- 'email', 'web', 'digest'
    message           TEXT         NULL,
    notification_time DATETIME     NOT NULL,
    sent              BOOLEAN      NOT NULL DEFAULT FALSE,
    read_at           DATETIME     NULL,
    created_at        TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id)       REFERENCES users(user_id)           ON DELETE CASCADE,
    FOREIGN KEY (assignment_id) REFERENCES assignments(assignment_id) ON DELETE SET NULL
);
