/**
 * syllabusService.js
 * Parse a syllabus PDF into structured course + assignment data using Gemini's
 * native document understanding (no separate PDF text-extraction library needed).
 *
 * Accepts the same aiOptions shape as aiService ({ apiKey, model, tier }) but
 * forces a document-capable model for parsing, since the lite default may not
 * support PDF input.
 */

// Document understanding requires a vision/doc-capable model.
const DOC_MODEL = 'gemini-2.5-flash';

const PARSE_SYSTEM = `You are a precise academic data extractor. You are given a course syllabus PDF.
Extract the course metadata and every graded assignment, exam, quiz, or project with a date.
Respond with ONLY valid JSON (no markdown, no commentary) in exactly this shape:
{
  "course_name": string | null,
  "course_code": string | null,
  "instructor": string | null,
  "assignments": [
    {
      "name": string,
      "due_date": string | null,   // ISO 8601 "YYYY-MM-DD" if a date is present, else null
      "points": number | null,
      "type": "assignment" | "exam" | "quiz" | "project" | "reading" | "other"
    }
  ]
}
Rules:
- Only include items that represent gradable work or scheduled assessments.
- If the syllabus gives a year, use it; otherwise infer the most likely academic year and still output a full ISO date.
- Never invent assignments that are not in the document. If none are found, return an empty array.`;

/**
 * @param {Buffer} pdfBuffer
 * @param {{ apiKey?: string, model?: string, tier?: string }} [aiOptions]
 * @returns {Promise<{ course_name, course_code, instructor, assignments: Array }>}
 */
const parseSyllabus = async (pdfBuffer, aiOptions = {}) => {
    const { GoogleGenAI } = require('@google/genai');
    const apiKey = aiOptions.apiKey || process.env.GEMINI_API_KEY;
    if (!apiKey) {
        throw new Error('No Gemini API key available. Set GEMINI_API_KEY or add your own in Settings → AI.');
    }

    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
        model: DOC_MODEL,
        contents: [
            { inlineData: { mimeType: 'application/pdf', data: pdfBuffer.toString('base64') } },
            { text: 'Extract the course and assignments from this syllabus as JSON.' },
        ],
        config: { systemInstruction: PARSE_SYSTEM },
    });

    const raw = (response.text || '').trim();
    const parsed = extractJson(raw);

    // Normalize / harden the shape so the controller can trust it.
    const assignments = Array.isArray(parsed.assignments) ? parsed.assignments : [];
    return {
        course_name: parsed.course_name || null,
        course_code: parsed.course_code || null,
        instructor:  parsed.instructor  || null,
        assignments: assignments
            .filter((a) => a && typeof a.name === 'string' && a.name.trim())
            .map((a) => ({
                name:     a.name.trim().slice(0, 255),
                due_date: normalizeDate(a.due_date),
                points:   normalizePoints(a.points),
                type:     ['assignment', 'exam', 'quiz', 'project', 'reading', 'other'].includes(a.type) ? a.type : 'assignment',
            })),
    };
};

// Strip ```json fences if the model added them, then JSON.parse.
const extractJson = (raw) => {
    let text = raw;
    const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fence) text = fence[1];
    // Fall back to the first {...} block if there's stray prose.
    const brace = text.indexOf('{');
    const lastBrace = text.lastIndexOf('}');
    if (brace !== -1 && lastBrace !== -1) text = text.slice(brace, lastBrace + 1);
    try {
        return JSON.parse(text);
    } catch {
        return { assignments: [] };
    }
};

const normalizeDate = (d) => {
    if (!d || typeof d !== 'string') return null;
    const parsed = new Date(d);
    if (isNaN(parsed.getTime())) return null;
    return parsed.toISOString().slice(0, 10); // YYYY-MM-DD
};

const normalizePoints = (p) => {
    const n = Number(p);
    return Number.isFinite(n) && n >= 0 ? n : null;
};

module.exports = { parseSyllabus, DOC_MODEL };
