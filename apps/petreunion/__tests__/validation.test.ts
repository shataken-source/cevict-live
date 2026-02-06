/**
 * Unit tests for validation functions
 */

import {
  sanitizeString,
  validateEmail,
  validatePhone,
  normalizePhone,
  validateDateNotFuture,
  validateDateRange,
  validatePetType,
  validateSize,
  validateUrl,
  MAX_LENGTHS,
} from '../lib/validation';

describe('Validation Functions', () => {
  describe('sanitizeString', () => {
    it('should remove dangerous characters', () => {
      const input = '<script>alert("xss")</script>';
      const result = sanitizeString(input, 100);
      expect(result).not.toContain('<script>');
      expect(result).not.toContain('</script>');
    });

    it('should limit string length', () => {
      const longString = 'a'.repeat(200);
      const result = sanitizeString(longString, 50);
      expect(result?.length).toBe(50);
    });

    it('should return null for empty input', () => {
      expect(sanitizeString('', 100)).toBeNull();
      expect(sanitizeString('   ', 100)).toBeNull();
    });
  });

  describe('validateEmail', () => {
    it('should accept valid emails', () => {
      expect(validateEmail('test@example.com')).toBe(true);
      expect(validateEmail('user.name+tag@example.co.uk')).toBe(true);
    });

    it('should reject invalid emails', () => {
      expect(validateEmail('notanemail')).toBe(false);
      expect(validateEmail('@example.com')).toBe(false);
      expect(validateEmail('test@')).toBe(false);
    });
  });

  describe('validatePhone', () => {
    it('should accept valid phone numbers', () => {
      expect(validatePhone('5551234567')).toBe(true);
      expect(validatePhone('(555) 123-4567')).toBe(true);
      expect(validatePhone('555-123-4567')).toBe(true);
      expect(validatePhone('+15551234567')).toBe(true);
    });

    it('should reject invalid phone numbers', () => {
      expect(validatePhone('123')).toBe(false);
      expect(validatePhone('abc123')).toBe(false);
    });
  });

  describe('normalizePhone', () => {
    it('should normalize US phone numbers', () => {
      expect(normalizePhone('5551234567')).toBe('+15551234567');
      expect(normalizePhone('(555) 123-4567')).toBe('+15551234567');
    });

    it('should preserve international format', () => {
      expect(normalizePhone('+441234567890')).toBe('+441234567890');
    });
  });

  describe('validateDateNotFuture', () => {
    it('should accept past dates', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      expect(validateDateNotFuture(yesterday.toISOString().split('T')[0])).toBe(true);
    });

    it('should reject future dates', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      expect(validateDateNotFuture(tomorrow.toISOString().split('T')[0])).toBe(false);
    });
  });

  describe('validatePetType', () => {
    it('should accept dog and cat', () => {
      expect(validatePetType('dog')).toBe('dog');
      expect(validatePetType('cat')).toBe('cat');
      expect(validatePetType('Dog')).toBe('dog'); // Case insensitive
      expect(validatePetType('CAT')).toBe('cat');
    });

    it('should reject invalid pet types', () => {
      expect(validatePetType('hamster')).toBeNull();
      expect(validatePetType('bird')).toBeNull();
    });
  });

  describe('validateSize', () => {
    it('should accept valid sizes', () => {
      expect(validateSize('small')).toBe('small');
      expect(validateSize('medium')).toBe('medium');
      expect(validateSize('large')).toBe('large');
    });

    it('should reject invalid sizes', () => {
      expect(validateSize('tiny')).toBeNull();
      expect(validateSize('huge')).toBeNull();
    });
  });

  describe('validateUrl', () => {
    it('should accept valid URLs', () => {
      expect(validateUrl('https://example.com/image.jpg')).toBe(true);
      expect(validateUrl('http://example.com/image.jpg')).toBe(true);
      expect(validateUrl('data:image/png;base64,iVBORw0KGgo=')).toBe(true);
    });

    it('should reject invalid URLs', () => {
      expect(validateUrl('not a url')).toBe(false);
      expect(validateUrl('javascript:alert(1)')).toBe(false);
    });
  });
});
