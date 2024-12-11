import crypto from 'crypto';
import dotenv from 'dotenv';

// Load environment variables from .env
dotenv.config();

const KEY = process.env.KEY_HASH as string;
if (!KEY) {
  throw new Error('KEY_HASH is missing');
}

// Use a hash of the key to ensure compatibility with AES-256
const derivedKey = crypto.createHash('sha256').update(KEY).digest(); // Produces a 32-byte key

// Encryption function (AES-256-ECB)
const encrypt = (text: string) => {
  const cipher = crypto.createCipheriv('aes-256-ecb', derivedKey, null);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return encrypted;
};

// Decryption function (AES-256-ECB)
const decrypt = (encryptedData: string) => {
  const decipher = crypto.createDecipheriv('aes-256-ecb', derivedKey, null);
  let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
};

export { encrypt, decrypt };
