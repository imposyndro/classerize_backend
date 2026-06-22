const db = require('../db');

// GET /api/grades?courseId=
const listGrades = async (req, res, next) => {
    const userId = req.user.userId;
    const { courseId } = req.query;

    const conditions = ['g.user_id = ?'];
    const params = [userId];
    if (courseId) { conditions.push('g.course_id = ?'); params.push(courseId); }

    try {
        const [grades] = await db.query(
            `SELECT g.grade_id, g.course_id, g.assignment_id,
                    g.score, g.points_possible, g.grade_percent, g.letter_grade,
                    g.submitted_at, g.graded_at,
                    c.course_name, c.course_code, c.institution_name, c.color,
                    a.assignment_name
             FROM grades g
             JOIN courses c ON g.course_id = c.course_id
             LEFT JOIN assignments a ON g.assignment_id = a.assignment_id
             WHERE ${conditions.join(' AND ')}
             ORDER BY g.graded_at DESC`,
            params
        );
        res.json({ grades });
    } catch (err) {
        next(err);
    }
};

// GET /api/grades/summary — one row per course with current grade
const gradesSummary = async (req, res, next) => {
    const userId = req.user.userId;
    try {
        const [summary] = await db.query(
            `SELECT g.course_id, c.course_name, c.course_code, c.institution_name, c.color,
                    la.lms_name, la.title AS account_title,
                    g.grade_percent, g.letter_grade
             FROM grades g
             JOIN courses c ON g.course_id = c.course_id
             JOIN linked_accounts la ON c.account_id = la.account_id
             WHERE g.user_id = ? AND g.assignment_id IS NULL
             ORDER BY c.course_name`,
            [userId]
        );
        res.json({ summary });
    } catch (err) {
        next(err);
    }
};

// GET /api/grades/trend/:courseId — assignment grades in chronological order for a line chart
const gradeTrend = async (req, res, next) => {
    const userId = req.user.userId;
    const { courseId } = req.params;

    try {
        // Verify course belongs to user
        const [[course]] = await db.query(
            'SELECT course_id, course_name, color FROM courses WHERE course_id = ? AND user_id = ?',
            [courseId, userId]
        );
        if (!course) return res.status(404).json({ error: 'Course not found.' });

        const [points] = await db.query(
            `SELECT g.grade_id, g.grade_percent, g.letter_grade, g.score, g.points_possible,
                    g.graded_at, a.assignment_name, a.due_date
             FROM grades g
             JOIN assignments a ON g.assignment_id = a.assignment_id
             WHERE g.user_id = ? AND g.course_id = ? AND g.assignment_id IS NOT NULL
             ORDER BY COALESCE(g.graded_at, a.due_date) ASC`,
            [userId, courseId]
        );

        res.json({ course, trend: points });
    } catch (err) {
        next(err);
    }
};

// POST /api/grades/whatif — project final grade with hypothetical scores
const whatIf = async (req, res, next) => {
    const userId = req.user.userId;
    const { courseId, scenarios = [] } = req.body;

    if (!courseId) return res.status(400).json({ error: 'courseId is required.' });

    try {
        // Fetch all assignment grades + ungraded pending assignments for this course
        const [graded] = await db.query(
            `SELECT g.assignment_id, g.score, g.points_possible, g.grade_percent
             FROM grades g
             WHERE g.user_id = ? AND g.course_id = ? AND g.assignment_id IS NOT NULL`,
            [userId, courseId]
        );

        const [ungraded] = await db.query(
            `SELECT a.assignment_id, a.points_possible, a.assignment_name
             FROM assignments a
             LEFT JOIN grades g ON g.assignment_id = a.assignment_id AND g.user_id = a.user_id
             WHERE a.user_id = ? AND a.course_id = ? AND a.status NOT IN ('graded')
               AND g.grade_id IS NULL AND a.points_possible IS NOT NULL`,
            [userId, courseId]
        );

        // Build scenario map
        const scenarioMap = {};
        for (const s of scenarios) {
            scenarioMap[s.assignmentId] = s.hypotheticalScore;
        }

        // Compute current weighted average from graded
        let earnedPts = 0, totalPts = 0;
        for (const g of graded) {
            earnedPts += Number(g.score || 0);
            totalPts  += Number(g.points_possible || 0);
        }

        // Apply scenarios to ungraded
        for (const u of ungraded) {
            const hypo = scenarioMap[u.assignment_id];
            if (hypo !== undefined) {
                earnedPts += Number(hypo);
                totalPts  += Number(u.points_possible);
            }
        }

        const projectedGrade = totalPts > 0 ? (earnedPts / totalPts) * 100 : null;

        // What score needed on remaining ungraded to hit target grades
        const remainingPts = ungraded
            .filter(u => scenarioMap[u.assignment_id] === undefined)
            .reduce((s, u) => s + Number(u.points_possible), 0);

        const neededFor = (targetPct) => {
            if (remainingPts === 0) return null;
            const needed = (targetPct / 100) * (totalPts + remainingPts) - earnedPts;
            return Math.max(0, (needed / remainingPts) * 100);
        };

        res.json({
            projectedGrade,
            remainingAssignments: ungraded.filter(u => scenarioMap[u.assignment_id] === undefined),
            neededForA:  neededFor(90),
            neededForB:  neededFor(80),
            neededForC:  neededFor(70),
        });
    } catch (err) {
        next(err);
    }
};

module.exports = { listGrades, gradesSummary, gradeTrend, whatIf };
