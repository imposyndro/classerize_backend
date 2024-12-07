-- Complete schema including `linked_accounts` updates
CREATE DATABASE IF NOT EXISTS classerize;
USE classerize;

-- Users table
CREATE TABLE users (
                       user_id INT AUTO_INCREMENT PRIMARY KEY,
                       username VARCHAR(50) NOT NULL UNIQUE,
                       email VARCHAR(100) NOT NULL UNIQUE,
                       password_hash VARCHAR(255) NOT NULL,
                       role VARCHAR(50) DEFAULT 'user',
                       created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                       updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Sessions table
CREATE TABLE sessions (
                          session_id INT AUTO_INCREMENT PRIMARY KEY,
                          user_id INT NOT NULL,
                          token VARCHAR(512) NOT NULL,
                          refresh_token VARCHAR(512) DEFAULT NULL,
                          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                          expires_at DATETIME NOT NULL,
                          FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- LMS Providers table
CREATE TABLE lms_providers (
                               lms_id INT AUTO_INCREMENT PRIMARY KEY,
                               lms_name VARCHAR(50) NOT NULL UNIQUE,
                               default_base_url VARCHAR(255),
                               created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Updated Linked Accounts table
CREATE TABLE linked_accounts (
                                 account_id INT AUTO_INCREMENT PRIMARY KEY,
                                 user_id INT NOT NULL,
                                 lms_name VARCHAR(50) NOT NULL,              -- LMS name (e.g., Canvas, Google Classroom)
                                 lms_base_url VARCHAR(255) DEFAULT NULL,     -- Base URL for LMS API
                                 lms_user_id VARCHAR(100) DEFAULT NULL,      -- User identifier in the LMS
                                 access_token VARCHAR(1024) DEFAULT NULL,    -- Encrypted access token
                                 refresh_token VARCHAR(1024) DEFAULT NULL,   -- Encrypted refresh token
                                 token_expiry DATETIME DEFAULT NULL,         -- Token expiry timestamp
                                 api_base_url VARCHAR(255) NOT NULL,         -- LMS API base URL
                                 api_key VARCHAR(255) DEFAULT NULL,          -- Optional API key for specific LMS
                                 created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                                 updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                                 FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
                                 UNIQUE (user_id, lms_name)
);

-- Courses table
CREATE TABLE courses (
                         course_id INT AUTO_INCREMENT PRIMARY KEY,
                         user_id INT NOT NULL,
                         account_id INT NOT NULL,
                         lms_course_id VARCHAR(100) NOT NULL,
                         course_name VARCHAR(255) NOT NULL,
                         institution_name VARCHAR(100) NOT NULL,
                         lms_name VARCHAR(50) DEFAULT NULL,
                         start_date DATE DEFAULT NULL,
                         end_date DATE DEFAULT NULL,
                         created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                         FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
                         FOREIGN KEY (account_id) REFERENCES linked_accounts(account_id) ON DELETE CASCADE
);

-- Assignments table
CREATE TABLE assignments (
                             assignment_id INT AUTO_INCREMENT PRIMARY KEY,
                             course_id INT NOT NULL,
                             lms_assignment_id VARCHAR(100) NOT NULL,
                             assignment_name VARCHAR(255) NOT NULL,
                             due_date DATETIME DEFAULT NULL,
                             description TEXT DEFAULT NULL,
                             status VARCHAR(50) DEFAULT 'pending',
                             created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                             FOREIGN KEY (course_id) REFERENCES courses(course_id) ON DELETE CASCADE
);

-- Notifications table
CREATE TABLE notifications (
                               notification_id INT AUTO_INCREMENT PRIMARY KEY,
                               user_id INT NOT NULL,
                               assignment_id INT NOT NULL,
                               notification_type VARCHAR(50) NOT NULL,
                               notification_time DATETIME NOT NULL,
                               sent BOOLEAN DEFAULT FALSE,
                               created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                               FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
                               FOREIGN KEY (assignment_id) REFERENCES assignments(assignment_id) ON DELETE CASCADE
);

-- Calendar Events table
CREATE TABLE calendar_events (
                                 event_id INT AUTO_INCREMENT PRIMARY KEY,
                                 user_id INT NOT NULL,
                                 event_name VARCHAR(255) NOT NULL,
                                 event_date DATETIME NOT NULL,
                                 event_type VARCHAR(50) DEFAULT NULL,
                                 created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                                 FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);
