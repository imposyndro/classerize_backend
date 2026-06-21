/**
 * Unit tests for LMS service normalizers — pure functions, no network calls.
 */

const BlackboardService = require('../services/blackboardService');
const GoogleClassroomService = require('../services/googleClassroomService');
const MoodleService = require('../services/moodleService');

describe('BlackboardService.normalizeCourse', () => {
    test('maps BB course fields to standard shape', () => {
        const raw = {
            id: 'BB-COURSE-1',
            courseId: 'CS101',
            name: 'Intro to CS',
            availability: { available: 'Yes' },
        };
        const norm = BlackboardService.normalizeCourse(raw);
        expect(norm.lms_course_id).toBe('BB-COURSE-1');
        expect(norm.course_name).toBe('Intro to CS');
        expect(norm.course_code).toBe('CS101');
    });
});

describe('BlackboardService.normalizeAssignment', () => {
    test('maps BB content item to assignment shape', () => {
        const raw = {
            id: 'BB-A-1',
            title: 'Essay 1',
            description: { rawText: 'Write an essay.' },
            grading: {
                due: '2025-12-01T23:59:00Z',
                score: { possible: 100 },
            },
        };
        const norm = BlackboardService.normalizeAssignment(raw);
        expect(norm.lms_assignment_id).toBe('BB-A-1');
        expect(norm.assignment_name).toBe('Essay 1');
        expect(norm.points_possible).toBe(100);
        expect(norm.due_date).toBeDefined();
        expect(norm.description).toBe('Write an essay.');
    });

    test('handles missing grading gracefully', () => {
        const raw = { id: 'BB-A-2', title: 'Ungraded Task' };
        const norm = BlackboardService.normalizeAssignment(raw);
        expect(norm.points_possible).toBeNull();
        expect(norm.due_date).toBeNull();
    });
});

describe('GoogleClassroomService.normalizeAssignment', () => {
    test('maps GC courseWork with dueDate to assignment shape', () => {
        const raw = {
            id: 'GC-CW-1',
            title: 'Problem Set 2',
            description: 'Solve all problems.',
            dueDate: { year: 2025, month: 12, day: 15 },
            dueTime: { hours: 23, minutes: 59 },
            maxPoints: 80,
            submissionModificationMode: 'MODIFIABLE',
        };
        const norm = GoogleClassroomService.normalizeAssignment(raw);
        expect(norm.lms_assignment_id).toBe('GC-CW-1');
        expect(norm.assignment_name).toBe('Problem Set 2');
        expect(norm.due_date).toBeInstanceOf(Date);
        expect(norm.points_possible).toBe(80);
    });

    test('normalizeAssignment handles missing dueDate gracefully', () => {
        const raw = { id: 'GC-CW-2', title: 'Open Assignment', maxPoints: null };
        const norm = GoogleClassroomService.normalizeAssignment(raw);
        expect(norm.due_date).toBeNull();
    });
});

describe('MoodleService.normalizeAssignment', () => {
    test('converts Unix seconds to Date', () => {
        const futureTimestamp = Math.floor(Date.now() / 1000) + 10000;
        const raw = {
            id: 101,
            name: 'Moodle Quiz',
            intro: 'Quiz on chapter 3.',
            duedate: futureTimestamp,
            grade: 50,
        };
        const norm = MoodleService.normalizeAssignment(raw);
        // IDs are stored as strings for DB compatibility
        expect(norm.lms_assignment_id).toBe('101');
        expect(norm.due_date).toBeInstanceOf(Date);
        expect(norm.points_possible).toBe(50);
    });

    test('normalizeAssignment handles duedate=0 (no due date)', () => {
        const raw = { id: 102, name: 'Optional Task', intro: '', duedate: 0, grade: 0 };
        const norm = MoodleService.normalizeAssignment(raw);
        expect(norm.due_date).toBeNull();
    });
});

describe('MoodleService.normalizeCourse', () => {
    test('maps Moodle course fields', () => {
        const raw = {
            id: 5,
            fullname: 'Biology 101',
            shortname: 'BIO101',
            startdate: 1700000000,
            enddate: 1730000000,
        };
        const norm = MoodleService.normalizeCourse(raw);
        expect(norm.lms_course_id).toBe('5');
        expect(norm.course_name).toBe('Biology 101');
        expect(norm.course_code).toBe('BIO101');
        expect(norm.start_at).toBeInstanceOf(Date);
    });
});
