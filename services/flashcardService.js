/**
 * flashcardService.js
 * AI flashcard generation (Gemini) + the SM-2 spaced-repetition algorithm.
 */

const GEN_MODEL = 'gemini-2.5-flash';

const GEN_SYSTEM = `You are an expert tutor that writes high-quality study flashcards.
Given a topic and optional source material, produce concise question/answer cards that test understanding,
not just recall of trivia. Keep the "front" a clear question or prompt and the "back" a complete but concise answer.
Respond with ONLY valid JSON (no markdown, no commentary): an array of objects:
[{ "front": string, "back": string }]
Produce exactly the requested number of cards. Do not number them.`;

/**
 * Generate flashcards via Gemini.
 * @param {{ topic: string, sourceText?: string, count?: number }} input
 * @param {{ apiKey?: string, model?: string, tier?: string }} [aiOptions]
 * @returns {Promise<Array<{ front: string, back: string }>>}
 */
const generateFlashcards = async ({ topic, sourceText = '', count = 10 }, aiOptions = {}) => {
    const { GoogleGenAI } = require('@google/genai');
    const apiKey = aiOptions.apiKey || process.env.GEMINI_API_KEY;
    if (!apiKey) {
        throw new Error('No Gemini API key available. Set GEMINI_API_KEY or add your own in Settings → AI.');
    }

    const n = Math.min(Math.max(parseInt(count, 10) || 10, 1), 30);
    const prompt = `Topic: ${topic}
Number of cards: ${n}
${sourceText ? `\nSource material to base the cards on:\n${sourceText.slice(0, 6000)}` : ''}`;

    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
        model: GEN_MODEL,
        contents: prompt,
        config: { systemInstruction: GEN_SYSTEM },
    });

    const raw = (response.text || '').trim();
    const cards = extractJsonArray(raw);
    return cards
        .filter((c) => c && typeof c.front === 'string' && typeof c.back === 'string' && c.front.trim() && c.back.trim())
        .slice(0, n)
        .map((c) => ({ front: c.front.trim(), back: c.back.trim() }));
};

const extractJsonArray = (raw) => {
    let text = raw;
    const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fence) text = fence[1];
    const start = text.indexOf('[');
    const end = text.lastIndexOf(']');
    if (start !== -1 && end !== -1) text = text.slice(start, end + 1);
    try {
        const parsed = JSON.parse(text);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
};

/**
 * SM-2 spaced-repetition scheduler.
 * @param {{ ease_factor: number, interval_days: number, repetitions: number }} card  current state
 * @param {number} quality  recall quality 0–5 (0=blackout, 5=perfect)
 * @returns {{ ease_factor: number, interval_days: number, repetitions: number, due_date: string }}
 *
 * Reference: SuperMemo SM-2.
 *   EF' = EF + (0.1 - (5-q)*(0.08 + (5-q)*0.02)), clamped to a minimum of 1.3
 *   q < 3  → reset repetitions, review again tomorrow
 *   q >= 3 → reps 0→1 day, 1→6 days, else round(prev_interval * EF)
 */
const sm2 = (card, quality) => {
    const q = Math.min(Math.max(parseInt(quality, 10), 0), 5);
    let ease = Number(card.ease_factor) || 2.5;
    let interval = Number(card.interval_days) || 0;
    let reps = Number(card.repetitions) || 0;

    if (q < 3) {
        reps = 0;
        interval = 1;
    } else {
        if (reps === 0)      interval = 1;
        else if (reps === 1) interval = 6;
        else                 interval = Math.round(interval * ease);
        reps += 1;
    }

    ease = ease + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
    if (ease < 1.3) ease = 1.3;

    const due = new Date();
    due.setHours(0, 0, 0, 0);
    due.setDate(due.getDate() + interval);

    return {
        ease_factor:   Math.round(ease * 100) / 100,
        interval_days: interval,
        repetitions:   reps,
        due_date:      due.toISOString().slice(0, 10),
    };
};

module.exports = { generateFlashcards, sm2, GEN_MODEL };
