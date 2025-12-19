import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
// In prod, this should be a 32-byte hex string in ENV
const SECRET = process.env.ENCRYPTION_KEY;

if (!SECRET || SECRET === '0000000000000000000000000000000000000000000000000000000000000000') {
    if (process.env.NODE_ENV === 'production') {
        throw new Error('FATAL: ENCRYPTION_KEY is missing or insecure in production!');
    }
    console.warn('⚠️ WARNING: Using a default/missing ENCRYPTION_KEY. This is insecure for non-development use.');
}

const FINAL_SECRET = SECRET || '0000000000000000000000000000000000000000000000000000000000000000';

export function encrypt(text: string): string {
    const iv = crypto.randomBytes(16);
    const key = Buffer.from(FINAL_SECRET, 'hex');
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const tag = cipher.getAuthTag();

    // Format: IV:TAG:ENCRYPTED
    return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted}`;
}

export function decrypt(text: string): string {
    const parts = text.split(':');
    if (parts.length !== 3) throw new Error('Invalid encrypted string');

    const [ivHex, tagHex, encryptedHex] = parts;
    const iv = Buffer.from(ivHex, 'hex');
    const tag = Buffer.from(tagHex, 'hex');
    const key = Buffer.from(FINAL_SECRET, 'hex');

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);

    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
}
