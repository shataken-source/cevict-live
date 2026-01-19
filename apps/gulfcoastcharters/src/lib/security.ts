/**
 * Security Utilities
 * Enterprise-grade security helpers for authentication and data protection
 */

import DOMPurify from 'isomorphic-dompurify';

/**
 * Sanitize HTML content to prevent XSS attacks
 */
export function sanitizeHtml(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li'],
    ALLOWED_ATTR: ['href', 'target', 'rel']
  });
}

/**
 * Generate CSRF token for form protection
 */
export function generateCsrfToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Validate CSRF token
 */
export function validateCsrfToken(token: string, storedToken: string): boolean {
  return token === storedToken && token.length === 64;
}

/**
 * Secure session storage (in-memory for sensitive data)
 */
class SecureStorage {
  private storage = new Map<string, unknown>();
  
  set(key: string, value: unknown): void {
    this.storage.set(key, value);
  }
  
  get(key: string): unknown {
    return this.storage.get(key);


  }
  
  remove(key: string): void {
    this.storage.delete(key);
  }
  
  clear(): void {
    this.storage.clear();
  }
}

export const secureStorage = new SecureStorage();
