const db = require('../db');
const { generateFlashcards, sm2 } = require('../services/flashcardService');
const { resolveAIOptions } = require('../utils/resolveAIOptions');

// GET /api/flashcards/decks — all decks with card + due counts
const listDecks = async (req, res, next) => {
    try {
        const [decks] = await db.query(
            `SELECT d.deck_id, d.title, d.description, d.source, d.course_id, d.created_at,
                    c.course_name, c.color,
                    COUNT(f.card_id) AS card_count,
                    SUM(CASE WHEN f.due_date <= CURRENT_DATE THEN 1 ELSE 0 END) AS due_count
             FROM flashcard_decks d
             LEFT JOIN flashcards f ON f.deck_id = d.deck_id
             LEFT JOIN courses c ON d.course_id = c.course_id
             WHERE d.user_id = ?
             GROUP BY d.deck_id
             ORDER BY d.created_at DESC`,
            [req.user.userId]
        );
        // COUNT/SUM come back as strings/null — coerce to numbers.
        res.json({
            decks: decks.map((d) => ({
                ...d,
                card_count: Number(d.card_count) || 0,
                due_count:  Number(d.due_count)  || 0,
            })),
        });
    } catch (err) {
        next(err);
    }
};

// POST /api/flashcards/decks — create an empty manual deck
const createDeck = async (req, res, next) => {
    const { title, description, course_id } = req.body;
    if (!title || !title.trim()) return res.status(400).json({ error: 'title is required.' });
    try {
        const courseId = await resolveOwnedCourse(req.user.userId, course_id);
        const [result] = await db.query(
            'INSERT INTO flashcard_decks (user_id, course_id, title, description, source) VALUES (?, ?, ?, ?, ?)',
            [req.user.userId, courseId, title.trim(), description || null, 'manual']
        );
        res.status(201).json({ message: 'Deck created.', deck_id: result.insertId });
    } catch (err) {
        next(err);
    }
};

// POST /api/flashcards/generate — AI-generate a deck of cards
// Body: { title, topic, source_text?, count?, course_id? }
const generateDeck = async (req, res, next) => {
    const { title, topic, source_text, count, course_id } = req.body;
    if (!topic || !topic.trim()) return res.status(400).json({ error: 'topic is required.' });
    try {
        const aiOptions = await resolveAIOptions(req.user.userId);
        const cards = await generateFlashcards(
            { topic: topic.trim(), sourceText: source_text || '', count: count || 10 },
            aiOptions
        );
        if (!cards.length) return res.status(502).json({ error: 'The AI returned no usable cards. Try a more specific topic.' });

        const courseId = await resolveOwnedCourse(req.user.userId, course_id);
        const [deck] = await db.query(
            'INSERT INTO flashcard_decks (user_id, course_id, title, description, source) VALUES (?, ?, ?, ?, ?)',
            [req.user.userId, courseId, (title || topic).trim(), `AI-generated from: ${topic.trim()}`, 'ai']
        );

        // Bulk insert cards (all due immediately for first study).
        const values = cards.map((c) => [deck.insertId, req.user.userId, c.front, c.back]);
        await db.query(
            'INSERT INTO flashcards (deck_id, user_id, front, back) VALUES ?',
            [values]
        );

        res.status(201).json({ message: 'Deck generated.', deck_id: deck.insertId, count: cards.length });
    } catch (err) {
        next(err);
    }
};

// GET /api/flashcards/decks/:id — deck detail + all its cards
const getDeck = async (req, res, next) => {
    try {
        const [[deck]] = await db.query(
            `SELECT d.deck_id, d.title, d.description, d.source, d.course_id, d.created_at, c.course_name, c.color
             FROM flashcard_decks d
             LEFT JOIN courses c ON d.course_id = c.course_id
             WHERE d.deck_id = ? AND d.user_id = ?`,
            [req.params.id, req.user.userId]
        );
        if (!deck) return res.status(404).json({ error: 'Deck not found.' });

        const [cards] = await db.query(
            `SELECT card_id, front, back, ease_factor, interval_days, repetitions, due_date, last_reviewed_at
             FROM flashcards WHERE deck_id = ? AND user_id = ? ORDER BY card_id ASC`,
            [req.params.id, req.user.userId]
        );
        res.json({ deck, cards });
    } catch (err) {
        next(err);
    }
};

// DELETE /api/flashcards/decks/:id
const deleteDeck = async (req, res, next) => {
    try {
        const [result] = await db.query(
            'DELETE FROM flashcard_decks WHERE deck_id = ? AND user_id = ?',
            [req.params.id, req.user.userId]
        );
        if (!result.affectedRows) return res.status(404).json({ error: 'Deck not found.' });
        res.json({ message: 'Deck deleted.' });
    } catch (err) {
        next(err);
    }
};

// POST /api/flashcards/decks/:id/cards — add a manual card
const addCard = async (req, res, next) => {
    const { front, back } = req.body;
    if (!front || !back) return res.status(400).json({ error: 'front and back are required.' });
    try {
        const [[deck]] = await db.query(
            'SELECT deck_id FROM flashcard_decks WHERE deck_id = ? AND user_id = ?',
            [req.params.id, req.user.userId]
        );
        if (!deck) return res.status(404).json({ error: 'Deck not found.' });

        const [result] = await db.query(
            'INSERT INTO flashcards (deck_id, user_id, front, back) VALUES (?, ?, ?, ?)',
            [req.params.id, req.user.userId, front.trim(), back.trim()]
        );
        res.status(201).json({ message: 'Card added.', card_id: result.insertId });
    } catch (err) {
        next(err);
    }
};

// DELETE /api/flashcards/cards/:id
const deleteCard = async (req, res, next) => {
    try {
        const [result] = await db.query(
            'DELETE FROM flashcards WHERE card_id = ? AND user_id = ?',
            [req.params.id, req.user.userId]
        );
        if (!result.affectedRows) return res.status(404).json({ error: 'Card not found.' });
        res.json({ message: 'Card deleted.' });
    } catch (err) {
        next(err);
    }
};

// GET /api/flashcards/due?deck_id= — cards due for review today (optionally one deck)
const getDueCards = async (req, res, next) => {
    const { deck_id } = req.query;
    try {
        const params = [req.user.userId];
        let where = 'f.user_id = ? AND f.due_date <= CURRENT_DATE';
        if (deck_id) { where += ' AND f.deck_id = ?'; params.push(deck_id); }

        const [cards] = await db.query(
            `SELECT f.card_id, f.deck_id, f.front, f.back, f.ease_factor, f.interval_days,
                    f.repetitions, f.due_date, d.title AS deck_title
             FROM flashcards f
             JOIN flashcard_decks d ON f.deck_id = d.deck_id
             WHERE ${where}
             ORDER BY f.due_date ASC, f.card_id ASC`,
            params
        );
        res.json({ cards });
    } catch (err) {
        next(err);
    }
};

// POST /api/flashcards/cards/:id/review — apply SM-2 with a recall quality 0–5
const reviewCard = async (req, res, next) => {
    const quality = Number(req.body.quality);
    if (!Number.isInteger(quality) || quality < 0 || quality > 5) {
        return res.status(400).json({ error: 'quality must be an integer 0–5.' });
    }
    try {
        const [[card]] = await db.query(
            'SELECT card_id, ease_factor, interval_days, repetitions FROM flashcards WHERE card_id = ? AND user_id = ?',
            [req.params.id, req.user.userId]
        );
        if (!card) return res.status(404).json({ error: 'Card not found.' });

        const next_ = sm2(card, quality);
        await db.query(
            `UPDATE flashcards
             SET ease_factor = ?, interval_days = ?, repetitions = ?, due_date = ?, last_reviewed_at = NOW()
             WHERE card_id = ? AND user_id = ?`,
            [next_.ease_factor, next_.interval_days, next_.repetitions, next_.due_date, req.params.id, req.user.userId]
        );
        res.json({ message: 'Review recorded.', ...next_ });
    } catch (err) {
        next(err);
    }
};

// GET /api/flashcards/stats — totals for dashboards
const getStats = async (req, res, next) => {
    try {
        const [[stats]] = await db.query(
            `SELECT
                COUNT(*) AS total_cards,
                SUM(CASE WHEN due_date <= CURRENT_DATE THEN 1 ELSE 0 END) AS due_today,
                SUM(CASE WHEN DATE(last_reviewed_at) = CURRENT_DATE THEN 1 ELSE 0 END) AS reviewed_today
             FROM flashcards WHERE user_id = ?`,
            [req.user.userId]
        );
        res.json({
            total_cards:    Number(stats.total_cards)    || 0,
            due_today:      Number(stats.due_today)      || 0,
            reviewed_today: Number(stats.reviewed_today) || 0,
        });
    } catch (err) {
        next(err);
    }
};

// Helper: validate an optional course_id belongs to the user; returns id or null.
const resolveOwnedCourse = async (userId, courseId) => {
    if (!courseId) return null;
    const [[course]] = await db.query(
        'SELECT course_id FROM courses WHERE course_id = ? AND user_id = ?',
        [courseId, userId]
    );
    return course ? course.course_id : null;
};

module.exports = {
    listDecks, createDeck, generateDeck, getDeck, deleteDeck,
    addCard, deleteCard, getDueCards, reviewCard, getStats,
};
