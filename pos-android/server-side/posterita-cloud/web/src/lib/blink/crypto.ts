import crypto from 'crypto';

const ALGORITHM = 'aes-256-cbc';

/**
 * AES-256-CBC encryption as per Blink API specification.
 * @param plainText - text or object to encrypt
 * @param key - 32-character AES key
 * @param iv - 16-character initialization vector
 * @returns Base64 encoded encrypted string
 */
export function aesEncrypt(plainText: string | object, key: string, iv: string): string {
  const text = typeof plainText === 'object' ? JSON.stringify(plainText) : plainText;
  const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(key, 'utf8'), Buffer.from(iv, 'utf8'));
  let encrypted = cipher.update(text, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  return encrypted;
}

/**
 * AES-256-CBC decryption as per Blink API specification.
 * @param encryptedText - Base64 encoded encrypted string
 * @param key - 32-character AES key
 * @param iv - 16-character initialization vector
 * @returns decrypted plain text
 */
export function aesDecrypt(encryptedText: string, key: string, iv: string): string {
  const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(key, 'utf8'), Buffer.from(iv, 'utf8'));
  let decrypted = decipher.update(encryptedText, 'base64', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}
