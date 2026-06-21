/**
 * aiService.js
 * Provider-abstracted AI service.
 * Set AI_PROVIDER=openai (default) or AI_PROVIDER=gemini in .env.
 *
 * Capabilities:
 *   - summarizeAssignment(assignment): short, student-friendly summary
 *   - generateStudySchedule(assignments): prioritized study plan
 *   - assessUrgency(assignments): flag at-risk deadlines
 */

const OpenAI = process.env.AI_PROVIDER !== 'gemini'
    ? require('openai')
    : null;

// ── Provider: OpenAI ───────────────────────────────────────────────────────────

const openaiClient = OpenAI
    ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    : null;

const callOpenAI = async (systemPrompt, userPrompt) => {
    if (!openaiClient) throw new Error('OpenAI client not initialized');
    const completion = await openaiClient.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user',   content: userPrompt },
        ],
        max_tokens: 300,
        temperature: 0.4,
    });
    return completion.choices[0].message.content.trim();
};

// ── Provider: Google Gemini ────────────────────────────────────────────────────

const callGemini = async (systemPrompt, userPrompt) => {
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const result = await model.generateContent(`${systemPrompt}\n\n${userPrompt}`);
    return result.response.text().trim();
};

// ── Public API ─────────────────────────────────────────────────────────────────

const callAI = process.env.AI_PROVIDER === 'gemini' ? callGemini : callOpenAI;

/**
 * Generate a 2–3 sentence student-friendly summary of an assignment.
 * @param {{ assignment_name, description, due_date, points_possible, course_name }} assignment
 * @returns {string}
 */
const summarizeAssignment = async (assignment) => {
    const system = 'You are a helpful academic assistant. Summarize assignments concisely for students in 2-3 sentences. Be clear, direct, and practical.';
    const user = `Summarize this assignment:
Name: ${assignment.assignment_name}
Course: ${assignment.course_name || 'Unknown'}
Due: ${assignment.due_date ? new Date(assignment.due_date).toLocaleDateString() : 'No due date'}
Points: ${assignment.points_possible || 'N/A'}
Description: ${assignment.description ? assignment.description.slice(0, 600) : 'No description provided.'}`;

    return callAI(system, user);
};

/**
 * Generate a prioritized study schedule from a list of upcoming assignments.
 * @param {Array} assignments
 * @returns {string}
 */
const generateStudySchedule = async (assignments) => {
    if (!assignments.length) return 'No upcoming assignments to schedule.';

    const system = 'You are an academic coach. Generate a practical, day-by-day study schedule based on assignment deadlines. Be specific and realistic. Keep it under 300 words.';
    const upcoming = assignments
        .filter((a) => a.due_date)
        .sort((a, b) => new Date(a.due_date) - new Date(b.due_date))
        .slice(0, 10)
        .map((a) => `- ${a.assignment_name} (${a.course_name || 'Unknown'}) — due ${new Date(a.due_date).toLocaleDateString()}`)
        .join('\n');

    return callAI(system, `Create a study schedule for these upcoming assignments:\n${upcoming}`);
};

/**
 * Assess which assignments are at high risk of being missed.
 * @param {Array} assignments
 * @returns {Array<{ assignment_id, risk_level: 'high'|'medium'|'low', reason }>}
 */
const assessUrgency = async (assignments) => {
    if (!assignments.length) return [];

    const system = 'You are an academic advisor. Assess assignment urgency. Respond ONLY with a JSON array: [{"assignment_id": id, "risk_level": "high|medium|low", "reason": "brief reason"}]. No markdown.';
    const items = assignments
        .filter((a) => a.due_date && a.status === 'pending')
        .slice(0, 15)
        .map((a) => ({
            assignment_id: a.assignment_id,
            name: a.assignment_name,
            due: new Date(a.due_date).toLocaleDateString(),
            days_left: Math.ceil((new Date(a.due_date) - new Date()) / (1000 * 60 * 60 * 24)),
            points: a.points_possible,
        }));

    if (!items.length) return [];

    try {
        const raw = await callAI(system, JSON.stringify(items));
        return JSON.parse(raw);
    } catch {
        return [];
    }
};

module.exports = { summarizeAssignment, generateStudySchedule, assessUrgency };
