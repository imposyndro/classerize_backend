/**
 * syncService.js
 * Orchestrates syncing a linked account: fetches courses, assignments, grades,
 * and populates calendar_events. Dispatches to the right LMS handler.
 *
 * Called by lmsSyncWorker.js (BullMQ) and by POST /api/lms/sync/:accountId.
 */

const db = require('../db');
const { decrypt } = require('../utils/cryptoUtils');
const CanvasService = require('./canvasService');
const BlackboardService = require('./blackboardService');
const GoogleClassroomService = require('./googleClassroomService');
const MoodleService = require('./moodleService');

/**
 * Sync all data for one linked account.
 */
const syncAccount = async (accountId, userId) => {
    const [accounts] = await db.query(
        'SELECT * FROM linked_accounts WHERE account_id = ? AND user_id = ?',
        [accountId, userId]
    );
    if (!accounts.length) throw new Error(`Account ${accountId} not found for user ${userId}`);
    const account = accounts[0];

    const plainToken = decrypt(account.access_token);
    const refreshToken = account.refresh_token ? decrypt(account.refresh_token) : null;

    switch (account.lms_name.toLowerCase()) {
        case 'canvas':
            return syncCanvas(account, plainToken, userId);
        case 'blackboard':
            return syncBlackboard(account, plainToken, userId);
        case 'googleclassroom':
            return syncGoogleClassroom(account, plainToken, refreshToken, userId);
        case 'moodle':
            return syncMoodle(account, plainToken, userId);
        default:
            throw new Error(`LMS "${account.lms_name}" not supported.`);
    }
};

// ── Shared helpers ─────────────────────────────────────────────────────────────

const upsertCourse = async (userId, accountId, course) => {
    await db.query(
        `INSERT INTO courses
            (user_id, account_id, lms_course_id, course_name, course_code, start_date, end_date, time_zone, calendar_ics_url)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
            course_name = VALUES(course_name), course_code = VALUES(course_code),
            start_date = VALUES(start_date), end_date = VALUES(end_date),
            time_zone = VALUES(time_zone), calendar_ics_url = VALUES(calendar_ics_url),
            updated_at = NOW()`,
        [
            userId, accountId,
            String(course.lms_course_id),
            course.course_name,
            course.course_code || null,
            course.start_at ? new Date(course.start_at) : null,
            course.end_at   ? new Date(course.end_at)   : null,
            course.time_zone || null,
            course.calendar_ics_url || null,
        ]
    );
    const [rows] = await db.query(
        'SELECT course_id FROM courses WHERE account_id = ? AND lms_course_id = ?',
        [accountId, String(course.lms_course_id)]
    );
    return rows[0]?.course_id;
};

const upsertAssignment = async (courseId, userId, assignment) => {
    await db.query(
        `INSERT INTO assignments
            (course_id, user_id, lms_assignment_id, assignment_name, due_date, description, points_possible, submission_type)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
            assignment_name = VALUES(assignment_name), due_date = VALUES(due_date),
            description = VALUES(description), points_possible = VALUES(points_possible),
            submission_type = VALUES(submission_type), updated_at = NOW()`,
        [
            courseId, userId,
            String(assignment.lms_assignment_id),
            assignment.assignment_name,
            assignment.due_date ? new Date(assignment.due_date) : null,
            assignment.description || null,
            assignment.points_possible || null,
            assignment.submission_type || null,
        ]
    );
    if (assignment.due_date) {
        const [aRows] = await db.query(
            'SELECT assignment_id FROM assignments WHERE course_id = ? AND lms_assignment_id = ?',
            [courseId, String(assignment.lms_assignment_id)]
        );
        if (aRows.length) {
            await db.query(
                `INSERT INTO calendar_events (user_id, assignment_id, event_name, event_date, event_type, source)
                 VALUES (?, ?, ?, ?, 'assignment', ?)
                 ON DUPLICATE KEY UPDATE event_name = VALUES(event_name), event_date = VALUES(event_date)`,
                [userId, aRows[0].assignment_id, assignment.assignment_name, new Date(assignment.due_date), 'lms']
            );
        }
    }
};

// ── Canvas ─────────────────────────────────────────────────────────────────────

const syncCanvas = async (account, plainToken, userId) => {
    const canvas = new CanvasService(account.api_base_url, plainToken);
    const courses = await canvas.getCourses();
    let coursesUpserted = 0, assignmentsUpserted = 0, calendarEventsUpserted = 0;

    for (const c of courses) {
        if (!c.name) continue;
        const courseId = await upsertCourse(userId, account.account_id, {
            lms_course_id: c.id, course_name: c.name, course_code: c.course_code,
            start_at: c.start_at, end_at: c.end_at, time_zone: c.time_zone,
            calendar_ics_url: c.calendar?.ics,
        });
        coursesUpserted++;

        try {
            const assignments = await canvas.getAssignments(c.id);
            for (const a of assignments) {
                await upsertAssignment(courseId, userId, {
                    lms_assignment_id: a.id, assignment_name: a.name, due_date: a.due_at,
                    description: a.description, points_possible: a.points_possible,
                    submission_type: a.submission_types?.join(', '),
                });
                assignmentsUpserted++;
                if (a.due_at) calendarEventsUpserted++;
            }
        } catch { /* restricted course */ }

        try {
            const enrollment = await canvas.getGrades(c.id);
            if (enrollment?.grades) {
                await db.query(
                    `INSERT INTO grades (user_id, course_id, grade_percent, letter_grade)
                     VALUES (?, ?, ?, ?)
                     ON DUPLICATE KEY UPDATE grade_percent=VALUES(grade_percent), letter_grade=VALUES(letter_grade), updated_at=NOW()`,
                    [userId, courseId, enrollment.grades.current_score || null, enrollment.grades.current_grade || null]
                );
            }
        } catch { /* non-fatal */ }
    }

    await db.query('UPDATE linked_accounts SET last_synced = NOW() WHERE account_id = ?', [account.account_id]);
    return { coursesUpserted, assignmentsUpserted, calendarEventsUpserted };
};

// ── Blackboard ─────────────────────────────────────────────────────────────────

const syncBlackboard = async (account, plainToken, userId) => {
    const bb = new BlackboardService(account.api_base_url, plainToken);
    const courses = await bb.getCourses();
    let coursesUpserted = 0, assignmentsUpserted = 0;

    for (const c of courses) {
        const norm = BlackboardService.normalizeCourse(c);
        const courseId = await upsertCourse(userId, account.account_id, norm);
        coursesUpserted++;

        try {
            const assignments = await bb.getAssignments(c.id);
            for (const a of assignments) {
                await upsertAssignment(courseId, userId, BlackboardService.normalizeAssignment(a));
                assignmentsUpserted++;
            }
        } catch { /* restricted */ }
    }

    await db.query('UPDATE linked_accounts SET last_synced = NOW() WHERE account_id = ?', [account.account_id]);
    return { coursesUpserted, assignmentsUpserted };
};

// ── Google Classroom ───────────────────────────────────────────────────────────

const syncGoogleClassroom = async (account, plainToken, refreshToken, userId) => {
    const gc = new GoogleClassroomService(plainToken, refreshToken);
    const courses = await gc.getCourses();
    let coursesUpserted = 0, assignmentsUpserted = 0;

    for (const c of courses) {
        const norm = GoogleClassroomService.normalizeCourse(c);
        const courseId = await upsertCourse(userId, account.account_id, norm);
        coursesUpserted++;

        try {
            const assignments = await gc.getAssignments(c.id);
            for (const a of assignments) {
                await upsertAssignment(courseId, userId, GoogleClassroomService.normalizeAssignment(a));
                assignmentsUpserted++;
            }
        } catch { /* restricted */ }
    }

    await db.query('UPDATE linked_accounts SET last_synced = NOW() WHERE account_id = ?', [account.account_id]);
    return { coursesUpserted, assignmentsUpserted };
};

// ── Moodle ─────────────────────────────────────────────────────────────────────

const syncMoodle = async (account, plainToken, userId) => {
    const moodle = new MoodleService(account.api_base_url, plainToken);
    const courses = await moodle.getCourses();
    let coursesUpserted = 0, assignmentsUpserted = 0;

    for (const c of courses) {
        const norm = MoodleService.normalizeCourse(c);
        const courseId = await upsertCourse(userId, account.account_id, norm);
        coursesUpserted++;

        try {
            const assignments = await moodle.getAssignments(c.id);
            for (const a of assignments) {
                await upsertAssignment(courseId, userId, MoodleService.normalizeAssignment(a));
                assignmentsUpserted++;
            }
        } catch { /* restricted */ }
    }

    await db.query('UPDATE linked_accounts SET last_synced = NOW() WHERE account_id = ?', [account.account_id]);
    return { coursesUpserted, assignmentsUpserted };
};

module.exports = { syncAccount };
