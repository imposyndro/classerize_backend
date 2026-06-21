/**
 * aiService.js
 * Gemini-backed AI service with per-call key + model resolution.
 *
 * Tier logic (resolved by aiController before calling here):
 *   free  — platform key (GEMINI_API_KEY), model gemini-2.5-flash-lite-preview-06-17
 *   byok  — user-supplied decrypted key, user-chosen model
 *   pro   — platform key (GEMINI_API_KEY), model gemini-2.5-flash
 *
 * All public functions accept an optional `aiOptions` argument:
 *   { apiKey: string, model: string }
 * Falls back to env defaults when omitted.
 */

const DEFAULT_MODEL  = 'gemini-2.5-flash-lite-preview-06-17';
const PRO_MODEL      = 'gemini-2.5-flash';

const ALLOWED_MODELS = new Set([
    'gemini-2.5-flash-lite-preview-06-17',
    'gemini-2.5-flash',
    'gemini-2.5-pro',
]);

/**
 * Resolve { apiKey, model } from user settings or env defaults.
 * @param {{ apiKey?: string, model?: string, tier?: string } | undefined} opts
 */
const resolveOptions = (opts = {}) => {
    const apiKey = opts.apiKey || process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('No Gemini API key available. Set GEMINI_API_KEY or add your own in Settings → AI.');

    let model = opts.model || null;
    if (model && !ALLOWED_MODELS.has(model)) model = null; // reject unknown models
    if (!model) model = opts.tier === 'pro' ? PRO_MODEL : DEFAULT_MODEL;

    return { apiKey, model };
};

// ── Low-level Gemini call ─────────────────────────────────────────────────────

const callGemini = async (systemPrompt, userPrompt, aiOptions) => {
    const { GoogleGenAI } = require('@google/genai');
    const { apiKey, model } = resolveOptions(aiOptions);
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
        model,
        contents: userPrompt,
        config: { systemInstruction: systemPrompt },
    });
    return response.text.trim();
};

// ── Public API ─────────────────────────────────────────────────────────────────

/**
 * Generate a 2–3 sentence student-friendly summary of an assignment.
 * @param {{ assignment_name, description, due_date, points_possible, course_name }} assignment
 * @param {{ apiKey?, model?, tier? }} [aiOptions]
 */
const summarizeAssignment = async (assignment, aiOptions) => {
    const system = 'You are a helpful academic assistant. Summarize assignments concisely for students in 2-3 sentences. Be clear, direct, and practical.';
    const user = `Summarize this assignment:
Name: ${assignment.assignment_name}
Course: ${assignment.course_name || 'Unknown'}
Due: ${assignment.due_date ? new Date(assignment.due_date).toLocaleDateString() : 'No due date'}
Points: ${assignment.points_possible || 'N/A'}
Description: ${assignment.description ? assignment.description.slice(0, 600) : 'No description provided.'}`;

    return callGemini(system, user, aiOptions);
};

/**
 * Generate a prioritized study schedule from a list of upcoming assignments.
 * @param {Array} assignments
 * @param {{ apiKey?, model?, tier? }} [aiOptions]
 */
const generateStudySchedule = async (assignments, aiOptions) => {
    if (!assignments.length) return 'No upcoming assignments to schedule.';

    const system = 'You are an academic coach. Generate a practical, day-by-day study schedule based on assignment deadlines. Be specific and realistic. Keep it under 300 words.';
    const upcoming = assignments
        .filter((a) => a.due_date)
        .sort((a, b) => new Date(a.due_date) - new Date(b.due_date))
        .slice(0, 10)
        .map((a) => `- ${a.assignment_name} (${a.course_name || 'Unknown'}) — due ${new Date(a.due_date).toLocaleDateString()}`)
        .join('\n');

    return callGemini(system, `Create a study schedule for these upcoming assignments:\n${upcoming}`, aiOptions);
};

/**
 * Assess which assignments are at high risk of being missed.
 * @param {Array} assignments
 * @param {{ apiKey?, model?, tier? }} [aiOptions]
 * @returns {Array<{ assignment_id, risk_level: 'high'|'medium'|'low', reason }>}
 */
const assessUrgency = async (assignments, aiOptions) => {
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
        const raw = await callGemini(system, JSON.stringify(items), aiOptions);
        return JSON.parse(raw);
    } catch {
        return [];
    }
};

module.exports = { summarizeAssignment, generateStudySchedule, assessUrgency, DEFAULT_MODEL, PRO_MODEL, ALLOWED_MODELS };
