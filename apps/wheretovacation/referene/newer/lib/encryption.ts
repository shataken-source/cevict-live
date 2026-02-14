/**
 * Enterprise-Level Encryption Utilities
 * AES-256-GCM encryption for sensitive user data
 * All personal information is encrypted at rest
 */

import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // 128 bits
const SALT_LENGTH = 64; // 512 bits
const TAG_LENGTH = 16; // 128 bits
const KEY_LENGTH = 32; // 256 bits
const ITERATIONS = 100000; // PBKDF2 iterations

/**
 * Get encryption key from environment or generate from master key
 */
function getEncryptionKey(): Buffer {
  const masterKey = process.env.ENCRYPTION_MASTER_KEY || process.env.SUPABASE_ENCRYPTION_KEY;
  
  if (!masterKey) {
    throw new Error('ENCRYPTION_MASTER_KEY or SUPABASE_ENCRYPTION_KEY must be set for data encryption');
  }

  // Derive a consistent key from the master key
  return crypto.pbkdf2Sync(masterKey, 'cevict-encryption-salt', ITERATIONS, KEY_LENGTH, 'sha256');
}

/**
 * Encrypt sensitive data
 * Returns: base64 encoded string with format: iv:salt:tag:encryptedData
 */
export function encrypt(data: string): string {
  try {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    const salt = crypto.randomBytes(SALT_LENGTH);
    
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    
    let encrypted = cipher.update(data, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    
    const tag = cipher.getAuthTag();
    
    // Combine: iv:salt:tag:encryptedData
    return `${iv.toString('base64')}:${salt.toString('base64')}:${tag.toString('base64')}:${encrypted}`;
  } catch (error: any) {
    console.error('[Encryption] Error encrypting data:', error);
    throw new Error(`Encryption failed: ${error.message}`);
  }
}

/**
 * Decrypt sensitive data
 * Input: base64 encoded string with format: iv:salt:tag:encryptedData
 */
export function decrypt(encryptedData: string): string {
  try {
    const key = getEncryptionKey();
    const parts = encryptedData.split(':');
    
    if (parts.length !== 4) {
      throw new Error('Invalid encrypted data format');
    }
    
    const [ivBase64, saltBase64, tagBase64, encrypted] = parts;
    const iv = Buffer.from(ivBase64, 'base64');
    const tag = Buffer.from(tagBase64, 'base64');
    
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);
    
    let decrypted = decipher.update(encrypted, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error: any) {
    console.error('[Encryption] Error decrypting data:', error);
    throw new Error(`Decryption failed: ${error.message}`);
  }
}

/**
 * Hash sensitive data (one-way, for searching/comparison)
 */
export function hash(data: string): string {
  return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Encrypt object (encrypts all string values)
 */
export function encryptObject<T extends Record<string, any>>(obj: T): T {
  const encrypted: any = {};
  
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string' && value.length > 0) {
      // Only encrypt if it's not already encrypted (doesn't contain colons from our format)
      if (!value.includes(':') || value.split(':').length !== 4) {
        encrypted[key] = encrypt(value);
      } else {
        encrypted[key] = value; // Already encrypted
      }
    } else {
      encrypted[key] = value; // Non-string values pass through
    }
  }
  
  return encrypted as T;
}

/**
 * Decrypt object (decrypts all encrypted string values)
 */
export function decryptObject<T extends Record<string, any>>(obj: T): T {
  const decrypted: any = {};
  
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string' && value.includes(':') && value.split(':').length === 4) {
      try {
        decrypted[key] = decrypt(value);
      } catch (error) {
        // If decryption fails, keep original (might not be encrypted)
        decrypted[key] = value;
      }
    } else {
      decrypted[key] = value;
    }
  }
  
  return decrypted as T;
}

