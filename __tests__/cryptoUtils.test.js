/**
 * Unit tests for cryptoUtils.js — encrypt/decrypt round trip.
 * These run without a DB or network connection.
 */

// Set required env vars before requiring the module
process.env.ENCRYPTION_KEY = 'a'.repeat(64); // 32 bytes as hex = 64 hex chars

const { encrypt, decrypt } = require('../utils/cryptoUtils');

describe('cryptoUtils', () => {
    test('encrypt returns a non-empty string in iv:ciphertext format', () => {
        const result = encrypt('hello world');
        expect(typeof result).toBe('string');
        expect(result).toContain(':');
        const parts = result.split(':');
        expect(parts).toHaveLength(2);
        expect(parts[0].length).toBe(32); // 16 bytes as hex
    });

    test('decrypt reverses encrypt', () => {
        const original = 'canvas_token_abc123';
        const encrypted = encrypt(original);
        const decrypted = decrypt(encrypted);
        expect(decrypted).toBe(original);
    });

    test('each encrypt call produces a different ciphertext (unique IV)', () => {
        const input = 'same input';
        const e1 = encrypt(input);
        const e2 = encrypt(input);
        expect(e1).not.toBe(e2);
        // But both decrypt correctly
        expect(decrypt(e1)).toBe(input);
        expect(decrypt(e2)).toBe(input);
    });

    test('decrypt throws on malformed input', () => {
        expect(() => decrypt('not:valid:format')).toThrow();
    });

    test('decrypt throws on null input', () => {
        expect(() => decrypt(null)).toThrow();
    });
});
