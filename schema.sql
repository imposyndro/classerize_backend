-- Database: classerize

-- Users table to store user information
CREATE TABLE users (
                       user_id INT AUTO_INCREMENT PRIMARY KEY,
                       username VARCHAR(50) NOT NULL UNIQUE,
                       email VARCHAR(100) NOT NULL UNIQUE,
                       password_hash VARCHAR(255) NOT NULL,
                       created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                       updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
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
