const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/authMiddleware');
const {
    listDecks, createDeck, generateDeck, getDeck, deleteDeck,
    addCard, deleteCard, getDueCards, reviewCard, getStats,
} = require('../controllers/flashcardController');

// Specific routes before parameterized ones to avoid conflicts.
router.get('/stats',            verifyToken, getStats);
router.get('/due',              verifyToken, getDueCards);
router.post('/generate',        verifyToken, generateDeck);

router.get('/decks',            verifyToken, listDecks);
router.post('/decks',           verifyToken, createDeck);
router.get('/decks/:id',        verifyToken, getDeck);
router.delete('/decks/:id',     verifyToken, deleteDeck);
router.post('/decks/:id/cards', verifyToken, addCard);

router.post('/cards/:id/review', verifyToken, reviewCard);
router.delete('/cards/:id',      verifyToken, deleteCard);

module.exports = router;
