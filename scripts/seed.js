/**
 * scripts/seed.js
 * Populates the DB with a test user plus realistic course/assignment/grade data.
 * Safe to re-run — clears existing seed data for the test user first.
 *
 * Usage:
 *   node scripts/seed.js
 *
 * TEST ACCOUNT CREDENTIALS
 * ─────────────────────────
 * Username : testuser
 * Email    : test@classerize.dev
 * Password : Test1234!
 * ─────────────────────────
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const bcrypt   = require('bcryptjs');
const crypto   = require('crypto');
const db       = require('../db');

// ── Helpers ───────────────────────────────────────────────────────────────────

const encrypt = (text) => {
    const iv  = crypto.randomBytes(16);
    const key = Buffer.from(process.env.ENCRYPTION_KEY, 'hex');
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    const enc = Buffer.concat([cipher.update(text), cipher.final()]);
    return `${iv.toString('hex')}:${enc.toString('hex')}`;
};

// Return a Date offset from today
const daysFromNow = (n) => {
    const d = new Date();
    d.setDate(d.getDate() + n);
    return d;
};

const fmt = (d) => d.toISOString().slice(0, 19).replace('T', ' ');

// ── Seed data ─────────────────────────────────────────────────────────────────

const TEST_USER = {
    username: 'testuser',
    email:    'test@classerize.dev',
    password: 'Test1234!',
};

// 4 fake Canvas accounts (one per institution)
const ACCOUNTS = [
    { lms: 'Canvas', url: 'https://canvas.instructure.com', title: 'State University' },
];

// Courses keyed by account index
const COURSES = [
    { account: 0, lms_id: 'c-101', name: 'Software Engineering',  code: 'CSCI 401', institution: 'State University' },
    { account: 0, lms_id: 'c-102', name: 'Linear Algebra',        code: 'MATH 301', institution: 'State University' },
    { account: 0, lms_id: 'c-103', name: 'Technical Writing',     code: 'ENGL 201', institution: 'State University' },
    { account: 0, lms_id: 'c-104', name: 'Modern World History',  code: 'HIST 250', institution: 'State University' },
];

// Assignments per course (by COURSES index)
// status: pending | submitted | graded | overdue
const ASSIGNMENTS = [
    // ── CSCI 401 ──────────────────────────────────────────────────────────────
    { course: 0, lms_id: 'a-1001', name: 'Project Proposal',           due: daysFromNow(-30), status: 'graded',    pts: 100, score: 92,   grade_pct: 92,  letter: 'A',  desc: 'Submit a 2-page proposal for your semester project including goals, timeline, and tech stack.', type: 'online_upload' },
    { course: 0, lms_id: 'a-1002', name: 'Architecture Diagram',       due: daysFromNow(-14), status: 'graded',    pts: 50,  score: 46,   grade_pct: 92,  letter: 'A',  desc: 'Design a complete system architecture diagram using draw.io or similar. Include all major components and their interactions.', type: 'online_upload' },
    { course: 0, lms_id: 'a-1003', name: 'Code Review Exercise',       due: daysFromNow(-5),  status: 'submitted', pts: 75,  score: null, grade_pct: null, letter: null, desc: 'Review the provided codebase and submit a written analysis identifying issues, suggested improvements, and security concerns.', type: 'online_text_entry' },
    { course: 0, lms_id: 'a-1004', name: 'Sprint 1 Deliverable',       due: daysFromNow(3),   status: 'pending',   pts: 150, score: null, grade_pct: null, letter: null, desc: 'Complete your first sprint. Submit a working prototype with unit tests and a brief demo video (3-5 minutes).', type: 'online_upload' },
    { course: 0, lms_id: 'a-1005', name: 'Unit Testing Lab',           due: daysFromNow(10),  status: 'pending',   pts: 50,  score: null, grade_pct: null, letter: null, desc: 'Write a comprehensive test suite for the provided calculator module. Aim for >90% coverage.', type: 'online_upload' },
    { course: 0, lms_id: 'a-1006', name: 'Final Project Demo',        due: daysFromNow(21),  status: 'pending',   pts: 200, score: null, grade_pct: null, letter: null, desc: 'Live demo of your complete semester project. Be prepared to answer questions and walk through your codebase.', type: 'media_recording' },

    // ── MATH 301 ──────────────────────────────────────────────────────────────
    { course: 1, lms_id: 'a-2001', name: 'Problem Set 1 — Vectors',    due: daysFromNow(-28), status: 'graded',    pts: 40,  score: 36,   grade_pct: 90,  letter: 'A-', desc: 'Complete problems 1-20 from Chapter 2. Show all work. Problems involving dot products and cross products.', type: 'online_upload' },
    { course: 1, lms_id: 'a-2002', name: 'Problem Set 2 — Matrices',   due: daysFromNow(-18), status: 'graded',    pts: 40,  score: 31,   grade_pct: 77.5, letter: 'C+', desc: 'Matrix operations, inverse computation, and determinants. Chapter 3 problems 1-15.', type: 'online_upload' },
    { course: 1, lms_id: 'a-2003', name: 'Midterm Exam',               due: daysFromNow(-7),  status: 'graded',    pts: 100, score: 83,   grade_pct: 83,  letter: 'B',  desc: 'Chapters 1-4 comprehensive exam covering vector spaces, linear transformations, and matrix decomposition.', type: 'online_quiz' },
    { course: 1, lms_id: 'a-2004', name: 'Problem Set 3 — Eigenvalues', due: daysFromNow(-2), status: 'overdue',   pts: 40,  score: null, grade_pct: null, letter: null, desc: 'Find eigenvalues and eigenvectors for the given matrices. Chapter 5 problems 1-12.', type: 'online_upload' },
    { course: 1, lms_id: 'a-2005', name: 'Problem Set 4 — SVD',        due: daysFromNow(8),   status: 'pending',   pts: 40,  score: null, grade_pct: null, letter: null, desc: 'Singular Value Decomposition exercises. Apply SVD to image compression example.', type: 'online_upload' },
    { course: 1, lms_id: 'a-2006', name: 'Final Exam',                 due: daysFromNow(28),  status: 'pending',   pts: 150, score: null, grade_pct: null, letter: null, desc: 'Comprehensive final exam. Covers all topics: vectors, matrices, transformations, eigenvalues, and SVD.', type: 'online_quiz' },

    // ── ENGL 201 ──────────────────────────────────────────────────────────────
    { course: 2, lms_id: 'a-3001', name: 'Resume & Cover Letter',      due: daysFromNow(-21), status: 'graded',    pts: 60,  score: 57,   grade_pct: 95,  letter: 'A',  desc: 'Draft a professional resume and tailored cover letter for a real job posting of your choice.', type: 'online_upload' },
    { course: 2, lms_id: 'a-3002', name: 'Technical Report Draft',     due: daysFromNow(-10), status: 'graded',    pts: 80,  score: 68,   grade_pct: 85,  letter: 'B',  desc: 'Write a 5-7 page technical report explaining a complex process to a non-technical audience. Include diagrams.', type: 'online_upload' },
    { course: 2, lms_id: 'a-3003', name: 'Peer Review',                due: daysFromNow(1),   status: 'pending',   pts: 30,  score: null, grade_pct: null, letter: null, desc: 'Complete structured peer reviews for two classmates\' technical reports. Use the provided rubric.', type: 'online_text_entry' },
    { course: 2, lms_id: 'a-3004', name: 'Revised Technical Report',   due: daysFromNow(14),  status: 'pending',   pts: 100, score: null, grade_pct: null, letter: null, desc: 'Revise your technical report based on instructor and peer feedback. Include a revision memo explaining changes.', type: 'online_upload' },
    { course: 2, lms_id: 'a-3005', name: 'Presentation',               due: daysFromNow(22),  status: 'pending',   pts: 80,  score: null, grade_pct: null, letter: null, desc: 'Deliver a 10-minute presentation of your technical report to the class. Q&A session follows.', type: 'media_recording' },

    // ── HIST 250 ──────────────────────────────────────────────────────────────
    { course: 3, lms_id: 'a-4001', name: 'Reading Response 1',         due: daysFromNow(-25), status: 'graded',    pts: 20,  score: 18,   grade_pct: 90,  letter: 'A-', desc: 'Write a 500-word response to Chapters 1-3 of "The Guns of August." Focus on causes of WWI.', type: 'online_text_entry' },
    { course: 3, lms_id: 'a-4002', name: 'Reading Response 2',         due: daysFromNow(-15), status: 'graded',    pts: 20,  score: 17,   grade_pct: 85,  letter: 'B',  desc: 'Response to the assigned readings on the interwar period (1919-1939). Analyze key political developments.', type: 'online_text_entry' },
    { course: 3, lms_id: 'a-4003', name: 'Document Analysis',          due: daysFromNow(-6),  status: 'submitted', pts: 50,  score: null, grade_pct: null, letter: null, desc: 'Analyze the provided primary source documents from WWII. Write a 2-page analysis examining author, context, and significance.', type: 'online_upload' },
    { course: 3, lms_id: 'a-4004', name: 'Reading Response 3',         due: daysFromNow(5),   status: 'pending',   pts: 20,  score: null, grade_pct: null, letter: null, desc: 'Response to Cold War readings (Chapters 12-15). Compare containment policies of Truman and Eisenhower.', type: 'online_text_entry' },
    { course: 3, lms_id: 'a-4005', name: 'Research Paper Outline',     due: daysFromNow(12),  status: 'pending',   pts: 40,  score: null, grade_pct: null, letter: null, desc: 'Submit a detailed outline for your 10-page research paper. Include thesis, major arguments, and bibliography (min. 8 sources).', type: 'online_upload' },
    { course: 3, lms_id: 'a-4006', name: 'Final Research Paper',       due: daysFromNow(26),  status: 'pending',   pts: 150, score: null, grade_pct: null, letter: null, desc: 'Final research paper (10-12 pages). Analyze a significant event or theme in modern world history using primary and secondary sources.', type: 'online_upload' },
];

// Course-level summary grades (assignment_id = NULL)
const COURSE_GRADES = [
    { course: 0, score: 138, pts: 150, pct: 92.0, letter: 'A'  },
    { course: 1, score: 150, pts: 180, pct: 83.3, letter: 'B'  },
    { course: 2, score: 125, pts: 140, pct: 89.3, letter: 'B+' },
    { course: 3, score:  35, pts:  40, pct: 87.5, letter: 'B+' },
];

// AI summary pre-fills for a couple of graded assignments (lms_id → summary)
const AI_SUMMARIES = {
    'a-1001': 'Submit a 2-page project proposal outlining your semester project goals, implementation timeline, and chosen tech stack. Graded on clarity, feasibility, and completeness. Worth 100 points.',
    'a-2003': 'Comprehensive midterm covering chapters 1-4: vector spaces, linear transformations, matrix decomposition. Closed-book exam, 100 points. Focus areas: eigenvalue computation and LU decomposition.',
    'a-3002': 'Write a 5-7 page technical report explaining a complex process to a non-technical audience. Requires diagrams and clear structure. Worth 80 points — focus on clarity over technical depth.',
};

// ── Main ──────────────────────────────────────────────────────────────────────

async function seed() {
    console.log('Connecting to database…\n');

    // ── 1. User ───────────────────────────────────────────────────────────────
    let userId;
    const [existing] = await db.query(
        'SELECT user_id FROM users WHERE email = ?', [TEST_USER.email]
    );

    if (existing.length) {
        userId = existing[0].user_id;
        console.log(`Found existing test user (user_id=${userId}) — resetting linked data…`);

        // Wipe linked data (cascade handles the rest)
        await db.query('DELETE FROM linked_accounts WHERE user_id = ?', [userId]);
        await db.query('DELETE FROM notification_preferences WHERE user_id = ?', [userId]);
        await db.query('DELETE FROM notifications WHERE user_id = ?', [userId]);
    } else {
        const hash = await bcrypt.hash(TEST_USER.password, 10);
        const [ins] = await db.query(
            'INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)',
            [TEST_USER.username, TEST_USER.email, hash]
        );
        userId = ins.insertId;
        console.log(`Created test user (user_id=${userId})`);
    }

    // ── 2. Linked account ─────────────────────────────────────────────────────
    const accountIds = [];
    for (const acct of ACCOUNTS) {
        const fakeToken = encrypt('seed-token-' + acct.lms);
        const [ins] = await db.query(
            `INSERT INTO linked_accounts
                (user_id, lms_name, access_token, api_base_url, title, last_synced)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [userId, acct.lms, fakeToken, acct.url, acct.title, fmt(daysFromNow(-1))]
        );
        accountIds.push(ins.insertId);
    }
    console.log(`Created ${accountIds.length} linked account(s)`);

    // ── 3. Courses ────────────────────────────────────────────────────────────
    const courseIds = [];
    for (const c of COURSES) {
        const [ins] = await db.query(
            `INSERT INTO courses
                (user_id, account_id, lms_course_id, course_name, course_code,
                 institution_name, start_date, end_date)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                userId,
                accountIds[c.account],
                c.lms_id,
                c.name,
                c.code,
                c.institution,
                fmt(daysFromNow(-90)),
                fmt(daysFromNow(35)),
            ]
        );
        courseIds.push(ins.insertId);
    }
    console.log(`Created ${courseIds.length} courses`);

    // ── 4. Assignments ────────────────────────────────────────────────────────
    const assignmentIds = {};  // lms_id → assignment_id
    for (const a of ASSIGNMENTS) {
        const summary = AI_SUMMARIES[a.lms_id] || null;
        const [ins] = await db.query(
            `INSERT INTO assignments
                (course_id, user_id, lms_assignment_id, assignment_name, due_date,
                 description, points_possible, status, submission_type, ai_summary)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                courseIds[a.course],
                userId,
                a.lms_id,
                a.name,
                fmt(a.due),
                a.desc,
                a.pts,
                a.status,
                a.type,
                summary,
            ]
        );
        assignmentIds[a.lms_id] = ins.insertId;
    }
    console.log(`Created ${ASSIGNMENTS.length} assignments`);

    // ── 5. Assignment-level grades (graded only) ──────────────────────────────
    const graded = ASSIGNMENTS.filter((a) => a.status === 'graded' && a.score !== null);
    for (const a of graded) {
        await db.query(
            `INSERT INTO grades
                (user_id, course_id, assignment_id, score, points_possible,
                 grade_percent, letter_grade, submitted_at, graded_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                userId,
                courseIds[a.course],
                assignmentIds[a.lms_id],
                a.score,
                a.pts,
                a.grade_pct,
                a.letter,
                fmt(daysFromNow(a.due.getDate() - new Date().getDate() - 2)), // submitted 2d before due
                fmt(daysFromNow(a.due.getDate() - new Date().getDate() + 1)), // graded 1d after due
            ]
        );
    }
    console.log(`Created ${graded.length} assignment grades`);

    // ── 6. Course-level summary grades ────────────────────────────────────────
    for (const g of COURSE_GRADES) {
        await db.query(
            `INSERT INTO grades
                (user_id, course_id, assignment_id, score, points_possible,
                 grade_percent, letter_grade, graded_at)
             VALUES (?, ?, NULL, ?, ?, ?, ?, NOW())`,
            [userId, courseIds[g.course], g.score, g.pts, g.pct, g.letter]
        );
    }
    console.log(`Created ${COURSE_GRADES.length} course-level grades`);

    // ── 7. Calendar events for all assignments ────────────────────────────────
    for (const a of ASSIGNMENTS) {
        await db.query(
            `INSERT INTO calendar_events
                (user_id, assignment_id, event_name, event_date, event_type, source)
             VALUES (?, ?, ?, ?, 'assignment', 'canvas')`,
            [userId, assignmentIds[a.lms_id], a.name, fmt(a.due)]
        );
    }
    console.log(`Created ${ASSIGNMENTS.length} calendar events`);

    // ── 8. Notification preferences ───────────────────────────────────────────
    await db.query(
        `INSERT INTO notification_preferences
            (user_id, email_enabled, web_enabled, daily_digest, deadline_hours)
         VALUES (?, TRUE, TRUE, TRUE, 24)`,
        [userId]
    );

    // ── 9. Sample notifications ───────────────────────────────────────────────
    const upcoming = ASSIGNMENTS.filter((a) => a.status === 'pending')
        .sort((a, b) => a.due - b.due)
        .slice(0, 4);

    for (const a of upcoming) {
        const hoursUntil = Math.round((a.due - new Date()) / 36e5);
        const msg = `"${a.name}" is due in ${hoursUntil < 48 ? hoursUntil + ' hours' : Math.round(hoursUntil / 24) + ' days'}.`;
        await db.query(
            `INSERT INTO notifications
                (user_id, assignment_id, notification_type, message, notification_time, sent, read_at)
             VALUES (?, ?, 'web', ?, NOW(), TRUE, NULL)`,
            [userId, assignmentIds[a.lms_id], msg]
        );
    }
    // One already-read notification
    await db.query(
        `INSERT INTO notifications
            (user_id, assignment_id, notification_type, message, notification_time, sent, read_at)
         VALUES (?, NULL, 'web', 'Welcome to Classerize! Connect your LMS to get started.', NOW(), TRUE, NOW())`,
        [userId]
    );
    console.log(`Created ${upcoming.length + 1} notifications`);

    // ── Done ──────────────────────────────────────────────────────────────────
    console.log(`
╔══════════════════════════════════════════════╗
║            SEED COMPLETE                     ║
╠══════════════════════════════════════════════╣
║  Email    : test@classerize.dev              ║
║  Password : Test1234!                        ║
╠══════════════════════════════════════════════╣
║  Courses       : ${String(COURSES.length).padEnd(27)}║
║  Assignments   : ${String(ASSIGNMENTS.length).padEnd(27)}║
║  Grades        : ${String(graded.length + COURSE_GRADES.length).padEnd(27)}║
║  Calendar evts : ${String(ASSIGNMENTS.length).padEnd(27)}║
╚══════════════════════════════════════════════╝
`);

    process.exit(0);
}

seed().catch((err) => {
    console.error('Seed failed:', err.message);
    process.exit(1);
});
