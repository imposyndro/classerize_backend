const crypto = require('crypto');

// Ensure these environment variables are set in your .env file
const ALGORITHM = 'aes-256-cbc';
const KEY = process.env.ENCRYPTION_KEY; // A 32-byte key for AES-256
const IV = process.env.ENCRYPTION_IV;   // A 16-byte Initialization Vector (IV)

const encrypt = (text) => {
    const iv = crypto.randomBytes(16); // Generate a random IV
    const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(KEY, 'hex'), iv);
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return `${iv.toString('hex')}:${encrypted.toString('hex')}`;
};

const decrypt = (text) => {
    try {
        if (!text) {
            throw new Error('Decrypt function received an undefined or null input.');
        }

        const [iv, encrypted] = text.split(':');
        if (!iv || !encrypted) {
            throw new Error('Invalid encrypted text format.');
        }

        const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(KEY, 'hex'), Buffer.from(iv, 'hex'));
        let decrypted = decipher.update(Buffer.from(encrypted, 'hex'));
        decrypted = Buffer.concat([decrypted, decipher.final()]);
        return decrypted.toString();
    } catch (error) {
        console.error('Error during decryption:', error.message);
        throw error;
    }
};



module.exports = { encrypt, decrypt };
