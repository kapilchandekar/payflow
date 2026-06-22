import crypto from 'crypto';

// Configuration
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const DEFAULT_KEY = 'your_super_secret_encryption_key'; // 32 characters minimum for aes-256

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || DEFAULT_KEY;

// Validate ENCRYPTION_KEY in production
if (process.env.NODE_ENV === 'production' && (!process.env.ENCRYPTION_KEY || process.env.ENCRYPTION_KEY === DEFAULT_KEY)) {
  throw new Error('FATAL ERROR: ENCRYPTION_KEY is not defined or is set to the default value in production. This is a severe security risk.');
}

if (Buffer.from(ENCRYPTION_KEY).length !== 32) {
  // If key is not exactly 32 bytes, hash it to make it 32 bytes
  console.warn('ENCRYPTION_KEY length is not 32 bytes. Hashing the key to ensure AES-256 compatibility.');
}

// Generate a valid 32-byte key from the provided string (SHA-256 hash)
const getKey = (): Buffer => crypto.createHash('sha256').update(String(ENCRYPTION_KEY)).digest();

/**
 * Encrypt a plain text string
 * @param text The plain text to encrypt
 * @returns A string combining the IV, Auth Tag, and Encrypted Data (format: iv:authTag:encryptedData)
 */
export const encrypt = (text: string): string => {
  try {
    const iv = crypto.randomBytes(IV_LENGTH);
    const key = getKey();
    
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag().toString('hex');
    
    return `${iv.toString('hex')}:${authTag}:${encrypted}`;
  } catch (error) {
    throw new Error('Encryption failed');
  }
};

/**
 * Decrypt an encrypted text
 * @param encryptedText The encrypted text (format: iv:authTag:encryptedData)
 * @returns The original plain text
 */
export const decrypt = (encryptedText: string): string => {
  try {
    const parts = encryptedText.split(':');
    
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted text format');
    }
    
    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encryptedData = parts[2];
    
    const key = getKey();
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    throw new Error('Decryption failed');
  }
};
