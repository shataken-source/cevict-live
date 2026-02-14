/**
 * Enterprise-level input validation and sanitization
 */

// Use DOMPurify for sanitization (works in both browser and Node.js)
let DOMPurify: any;
try {
  // Dynamic import to avoid build-time errors
  DOMPurify = require('isomorphic-dompurify');
} catch {
  // Fallback if not available
  DOMPurify = {
    sanitize: (input: string, options?: any) => {
      if (typeof input !== 'string') return '';
      // Basic XSS prevention
      return input
        .replace(/[<>]/g, '')
        .replace(/javascript:/gi, '')
        .replace(/on\w+=/gi, '');
    }
  };
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  sanitized?: any;
}

/**
 * Sanitize string input to prevent XSS
 */
export function sanitizeString(input: string): string {
  if (typeof input !== 'string') return '';
  return DOMPurify.sanitize(input, { ALLOWED_TAGS: [] });
}

/**
 * Sanitize object recursively
 */
export function sanitizeObject<T>(obj: T): T {
  if (typeof obj === 'string') {
    return sanitizeString(obj) as T;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item)) as T;
  }
  
  if (obj && typeof obj === 'object') {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      sanitized[key] = sanitizeObject(value);
    }
    return sanitized as T;
  }
  
  return obj;
}

/**
 * Validate email format
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate phone number (US format)
 */
export function validatePhone(phone: string): boolean {
  const phoneRegex = /^[\d\s\-\(\)\+]{10,15}$/;
  return phoneRegex.test(phone.replace(/\s/g, ''));
}

/**
 * Validate pet name
 */
export function validatePetName(name: string): ValidationResult {
  const errors: string[] = [];
  
  if (!name || name.trim().length === 0) {
    errors.push('Pet name is required');
  } else if (name.length > 100) {
    errors.push('Pet name must be less than 100 characters');
  } else if (!/^[a-zA-Z0-9\s\-'\.]+$/.test(name)) {
    errors.push('Pet name contains invalid characters');
  }
  
  return {
    valid: errors.length === 0,
    errors,
    sanitized: errors.length === 0 ? sanitizeString(name.trim()) : undefined
  };
}

/**
 * Validate location
 */
export function validateLocation(city: string, state: string): ValidationResult {
  const errors: string[] = [];
  
  if (!city || city.trim().length === 0) {
    errors.push('City is required');
  } else if (city.length > 100) {
    errors.push('City must be less than 100 characters');
  }
  
  if (!state || state.trim().length === 0) {
    errors.push('State is required');
  } else if (!/^[A-Z]{2}$/.test(state.toUpperCase())) {
    errors.push('State must be a valid 2-letter US state code');
  }
  
  return {
    valid: errors.length === 0,
    errors,
    sanitized: errors.length === 0 ? {
      city: sanitizeString(city.trim()),
      state: state.toUpperCase().trim()
    } : undefined
  };
}

/**
 * Validate pet data
 */
export function validatePetData(data: any): ValidationResult {
  const errors: string[] = [];
  const sanitized: any = {};
  
  // Validate required fields
  if (!data.pet_type || !['dog', 'cat'].includes(data.pet_type)) {
    errors.push('Pet type must be "dog" or "cat"');
  } else {
    sanitized.pet_type = data.pet_type;
  }
  
  if (!data.breed || data.breed.trim().length === 0) {
    errors.push('Breed is required');
  } else if (data.breed.length > 100) {
    errors.push('Breed must be less than 100 characters');
  } else {
    sanitized.breed = sanitizeString(data.breed.trim());
  }
  
  if (!data.color || data.color.trim().length === 0) {
    errors.push('Color is required');
  } else {
    sanitized.color = sanitizeString(data.color.trim());
  }
  
  // Validate optional fields
  if (data.pet_name) {
    const nameValidation = validatePetName(data.pet_name);
    if (nameValidation.valid) {
      sanitized.pet_name = nameValidation.sanitized;
    } else {
      errors.push(...nameValidation.errors);
    }
  }
  
  if (data.location_city && data.location_state) {
    const locationValidation = validateLocation(data.location_city, data.location_state);
    if (locationValidation.valid) {
      sanitized.location_city = locationValidation.sanitized.city;
      sanitized.location_state = locationValidation.sanitized.state;
    } else {
      errors.push(...locationValidation.errors);
    }
  }
  
  // Validate status
  if (data.status && !['lost', 'found', 'reunited'].includes(data.status)) {
    errors.push('Status must be "lost", "found", or "reunited"');
  } else if (data.status) {
    sanitized.status = data.status;
  }
  
  // Validate size
  if (data.size && !['small', 'medium', 'large'].includes(data.size)) {
    errors.push('Size must be "small", "medium", or "large"');
  } else if (data.size) {
    sanitized.size = data.size;
  }
  
  // Sanitize description
  if (data.description) {
    sanitized.description = sanitizeString(data.description.substring(0, 1000));
  }
  
  // Validate email if provided
  if (data.owner_email) {
    if (!validateEmail(data.owner_email)) {
      errors.push('Invalid email format');
    } else {
      sanitized.owner_email = data.owner_email.toLowerCase().trim();
    }
  }
  
  // Validate phone if provided
  if (data.owner_phone) {
    if (!validatePhone(data.owner_phone)) {
      errors.push('Invalid phone number format');
    } else {
      sanitized.owner_phone = data.owner_phone.replace(/\D/g, '');
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
    sanitized: errors.length === 0 ? sanitized : undefined
  };
}

/**
 * Validate search query
 */
export function validateSearchQuery(query: string): string {
  if (!query || typeof query !== 'string') return '';
  
  // Remove potentially dangerous characters
  const sanitized = query
    .replace(/[<>]/g, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+=/gi, '')
    .trim();
  
  // Limit length
  return sanitized.substring(0, 200);
}

/**
 * Validate pagination parameters
 */
export function validatePagination(page: number, limit: number): { page: number; limit: number } {
  const validPage = Math.max(1, Math.min(1000, Math.floor(page) || 1));
  const validLimit = Math.max(1, Math.min(100, Math.floor(limit) || 20));
  
  return { page: validPage, limit: validLimit };
}
