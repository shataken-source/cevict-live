import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const API_KEYS = new Map<string, { id: string; name: string; rateLimit: number }>();

// Initialize with some default API keys (in production, use database)
const DEFAULT_API_KEYS = [
  { id: uuidv4(), key: 'ck_test_1234567890abcdef', name: 'Test Key', rateLimit: 100 },
  { id: uuidv4(), key: 'ck_prod_abcdef1234567890', name: 'Production Key', rateLimit: 1000 }
];

DEFAULT_API_KEYS.forEach(apiKey => {
  API_KEYS.set(apiKey.key, { id: apiKey.id, name: apiKey.name, rateLimit: apiKey.rateLimit });
});

export function hashApiKey(key: string): string {
  return bcrypt.hashSync(key, 10);
}

export function validateApiKey(key: string): { valid: boolean; keyId?: string; name?: string; rateLimit?: number } {
  const apiKey = API_KEYS.get(key);
  if (!apiKey) {
    return { valid: false };
  }
  return { valid: true, keyId: apiKey.id, name: apiKey.name, rateLimit: apiKey.rateLimit };
}

export function generateApiKeyToken(keyId: string): string {
  return jwt.sign({ keyId }, JWT_SECRET, { expiresIn: '1h' });
}

export function verifyApiKeyToken(token: string): { valid: boolean; keyId?: string } {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { keyId: string };
    return { valid: true, keyId: decoded.keyId };
  } catch (error) {
    return { valid: false };
  }
}

export function extractApiKeyFromRequest(request: Request): string | null {
  // Try Authorization header first
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  
  // Try query parameter
  const url = new URL(request.url);
  return url.searchParams.get('apiKey') || url.searchParams.get('api_key');
}
