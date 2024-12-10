CREATE DATABASE classerize;
USE classerize;

-- Users table to store user information
CREATE TABLE users (
                       user_id INT AUTO_INCREMENT PRIMARY KEY,
                       username VARCHAR(50) NOT NULL UNIQUE,
                       email VARCHAR(100) NOT NULL UNIQUE,
                       password_hash VARCHAR(255) NOT NULL,
                       role VARCHAR(50) DEFAULT 'user', -- Add role column for user roles
                       created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                       updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Sessions table to manage user sessions and JWT tokens
CREATE TABLE sessions (
                          session_id INT AUTO_INCREMENT PRIMARY KEY,
                          user_id INT NOT NULL,
                          token VARCHAR(512) NOT NULL, -- Store JWT token or other session info
                          refresh_token VARCHAR(512),  -- Optional: Store refresh tokens for long-lived sessions
                          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                          expires_at DATETIME NOT NULL,
                          FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Linked Accounts table to store information about linked LMS accounts
CREATE TABLE linked_accounts (
                                 account_id INT AUTO_INCREMENT PRIMARY KEY,
                                 user_id INT NOT NULL,
                                 lms_name VARCHAR(50) NOT NULL,  -- Example: Canvas, Blackboard
                                 lms_user_id VARCHAR(100) NOT NULL,  -- User identifier from LMS
                                 access_token VARCHAR(255) NOT NULL, -- Token to interact with LMS APIs
                                 refresh_token VARCHAR(255),
                                 token_expiry DATETIME,
                                 created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                                 FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Courses table to store course information aggregated from different LMS platforms
CREATE TABLE courses (
                         course_id INT AUTO_INCREMENT PRIMARY KEY,
                         user_id INT NOT NULL,
                         account_id INT NOT NULL,
                         lms_course_id VARCHAR(100) NOT NULL, -- Course identifier from LMS
                         course_name VARCHAR(255) NOT NULL,
                         institution_name VARCHAR(100) NOT NULL,
                         start_date DATE,
                         end_date DATE,
                         created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                         FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
                         FOREIGN KEY (account_id) REFERENCES linked_accounts(account_id) ON DELETE CASCADE
);

-- Assignments table to store assignments for each course
CREATE TABLE assignments (
                             assignment_id INT AUTO_INCREMENT PRIMARY KEY,
                             course_id INT NOT NULL,
                             lms_assignment_id VARCHAR(100) NOT NULL, -- Assignment identifier from LMS
                             assignment_name VARCHAR(255) NOT NULL,
                             due_date DATETIME,
                             description TEXT,
                             status VARCHAR(50) DEFAULT 'pending', -- Status can be 'pending', 'submitted', 'completed', etc.
                             created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                             FOREIGN KEY (course_id) REFERENCES courses(course_id) ON DELETE CASCADE
);

-- Express MySQL Session table
CREATE TABLE express_sessions (
                                  session_id VARCHAR(128) COLLATE utf8mb4_bin NOT NULL,
                                  expires INT UNSIGNED NOT NULL,
                                  data TEXT COLLATE utf8mb4_bin,
                                  PRIMARY KEY (session_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;


-- Notifications table to store reminders for assignments and deadlines
CREATE TABLE notifications (
                               notification_id INT AUTO_INCREMENT PRIMARY KEY,
                               user_id INT NOT NULL,
                               assignment_id INT NOT NULL,
                               notification_type VARCHAR(50) NOT NULL,  -- Example: email, web notification
                               notification_time DATETIME NOT NULL,
                               sent BOOLEAN DEFAULT FALSE,
                               created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                               FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
                               FOREIGN KEY (assignment_id) REFERENCES assignments(assignment_id) ON DELETE CASCADE
);

-- Calendar Events table to store important dates for users
CREATE TABLE calendar_events (
                                 event_id INT AUTO_INCREMENT PRIMARY KEY,
                                 user_id INT NOT NULL,
                                 event_name VARCHAR(255) NOT NULL,
                                 event_date DATETIME NOT NULL,
                                 event_type VARCHAR(50), -- Example: course, assignment, custom
                                 created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                                 FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);
