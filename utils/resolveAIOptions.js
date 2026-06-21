/**
 * resolveAIOptions(userId)
 * Returns { apiKey, model, tier } for the given user.
 * Priority: user's BYOK key > platform key scoped by tier.
 * Used by aiController and aiSummaryWorker.
 */

const db = require('../db');
const { decrypt } = require('./cryptoutils');

const resolveAIOptions = async (userId) => {
    const [rows] = await db.query(
        'SELECT subscription_tier, gemini_api_key, ai_model FROM users WHERE user_id = ?',
        [userId]
    );
    if (!rows.length) return {};

    const { subscription_tier, gemini_api_key, ai_model } = rows[0];

    if (gemini_api_key) {
        try {
            return { apiKey: decrypt(gemini_api_key), model: ai_model || undefined };
        } catch {
            // Decryption failure — fall back to platform key
        }
    }

    return { tier: subscription_tier };
};

module.exports = { resolveAIOptions };
