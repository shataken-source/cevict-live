/**
 * Input validation utilities for Pet Reunion
 * Handles all edge cases and "human errors"
 */

// Maximum lengths for fields
export const MAX_LENGTHS = {
  petName: 100,
  breed: 100,
  color: 50,
  age: 50,
  description: 2000,
  location: 200,
  ownerName: 100,
  ownerEmail: 255,
  ownerPhone: 20,
  photoUrl: 500,
};

/**
 * Sanitize string input - removes dangerous characters and limits length
 */
export function sanitizeString(input: string | null | undefined, maxLength: number): string | null {
  if (!input) return null;
  
  // Trim whitespace
  let sanitized = input.trim();
  
  // Remove null bytes and control characters (except newlines/tabs for descriptions)
  sanitized = sanitized.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '');
  
  // Limit length
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }
  
  // Return null if empty after sanitization
  return sanitized || null;
}

/**
 * Validate email format
 */
export function validateEmail(email: string | null | undefined): boolean {
  if (!email || !email.trim()) return false;
  
  // Basic email regex (RFC 5322 simplified)
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim()) && email.length <= MAX_LENGTHS.ownerEmail;
}

/**
 * Validate phone number (flexible format)
 */
export function validatePhone(phone: string | null | undefined): boolean {
  if (!phone || !phone.trim()) return false;
  
  // Remove common phone formatting characters
  const cleaned = phone.replace(/[\s\-\(\)\+]/g, '');
  
  // Should be 10-15 digits (allows international)
  const phoneRegex = /^\d{10,15}$/;
  return phoneRegex.test(cleaned);
}

/**
 * Normalize phone number (removes formatting)
 */
export function normalizePhone(phone: string | null | undefined): string | null {
  if (!phone || !phone.trim()) return null;
  
  // Remove all non-digit characters except leading +
  const cleaned = phone.trim().replace(/[^\d\+]/g, '');
  
  // Add +1 if it's a 10-digit US number without country code
  if (cleaned.length === 10 && !cleaned.startsWith('+')) {
    return `+1${cleaned}`;
  }
  
  // Add + if it starts with 1 and is 11 digits (US number)
  if (cleaned.length === 11 && cleaned.startsWith('1') && !cleaned.startsWith('+')) {
    return `+${cleaned}`;
  }
  
  return cleaned || null;
}

/**
 * Validate date is not in the future
 */
export function validateDateNotFuture(dateString: string | null | undefined): boolean {
  if (!dateString) return false;
  
  const date = new Date(dateString);
  const today = new Date();
  today.setHours(23, 59, 59, 999); // End of today
  
  // Date should be valid and not in the future
  return !isNaN(date.getTime()) && date <= today;
}

/**
 * Validate date is within reasonable range (not more than 10 years ago)
 */
export function validateDateRange(dateString: string | null | undefined): boolean {
  if (!dateString) return false;
  
  const date = new Date(dateString);
  const tenYearsAgo = new Date();
  tenYearsAgo.setFullYear(tenYearsAgo.getFullYear() - 10);
  
  return !isNaN(date.getTime()) && date >= tenYearsAgo;
}

/**
 * Validate pet type
 */
export function validatePetType(petType: string | null | undefined): 'dog' | 'cat' | null {
  if (!petType) return null;
  
  const normalized = petType.toLowerCase().trim();
  if (normalized === 'dog' || normalized === 'cat') {
    return normalized as 'dog' | 'cat';
  }
  
  return null;
}

/**
 * Validate size
 */
export function validateSize(size: string | null | undefined): 'small' | 'medium' | 'large' | null {
  if (!size || !size.trim()) return null;
  
  const normalized = size.toLowerCase().trim();
  if (['small', 'medium', 'large'].includes(normalized)) {
    return normalized as 'small' | 'medium' | 'large';
  }
  
  return null;
}

/**
 * Validate URL format (for photo_url)
 */
export function validateUrl(url: string | null | undefined): boolean {
  if (!url || !url.trim()) return false;
  
  try {
    const urlObj = new URL(url);
    // Only allow http, https, and data URLs
    return ['http:', 'https:', 'data:'].includes(urlObj.protocol);
  } catch {
    return false;
  }
}

/**
 * Validate all form fields
 */
export interface ValidationResult {
  valid: boolean;
  errors: Record<string, string>;
}

export function validateLostPetForm(data: {
  petName?: string | null;
  petType?: string | null;
  breed?: string | null;
  color?: string | null;
  size?: string | null;
  age?: string | null;
  gender?: string | null;
  description?: string | null;
  location?: string | null;
  date_lost?: string | null;
  owner_name?: string | null;
  owner_email?: string | null;
  owner_phone?: string | null;
  photo_url?: string | null;
}): ValidationResult {
  const errors: Record<string, string> = {};

  // Required fields
  if (!data.petType || !validatePetType(data.petType)) {
    errors.petType = 'Please select a pet type (dog or cat)';
  }

  if (!data.color || !data.color.trim()) {
    errors.color = 'Please enter your pet\'s color';
  } else {
    const sanitized = sanitizeString(data.color, MAX_LENGTHS.color);
    if (!sanitized) {
      errors.color = 'Color cannot be empty';
    }
  }

  if (!data.date_lost) {
    errors.date_lost = 'Please select the date your pet was lost';
  } else if (!validateDateNotFuture(data.date_lost)) {
    errors.date_lost = 'Date cannot be in the future';
  } else if (!validateDateRange(data.date_lost)) {
    errors.date_lost = 'Date cannot be more than 10 years ago';
  }

  if (!data.location || !data.location.trim()) {
    errors.location = 'Please enter the location where your pet was last seen';
  } else {
    const sanitized = sanitizeString(data.location, MAX_LENGTHS.location);
    if (!sanitized) {
      errors.location = 'Location cannot be empty';
    }
  }

  // Optional but validated fields
  if (data.petName) {
    const sanitized = sanitizeString(data.petName, MAX_LENGTHS.petName);
    if (sanitized && sanitized.length < 1) {
      errors.petName = 'Pet name is too short';
    }
  }

  if (data.breed) {
    const sanitized = sanitizeString(data.breed, MAX_LENGTHS.breed);
    if (sanitized && sanitized.length < 1) {
      errors.breed = 'Breed is too short';
    }
  }

  if (data.age) {
    const sanitized = sanitizeString(data.age, MAX_LENGTHS.age);
    if (sanitized && sanitized.length < 1) {
      errors.age = 'Age is too short';
    }
  }

  if (data.description) {
    const sanitized = sanitizeString(data.description, MAX_LENGTHS.description);
    if (sanitized && sanitized.length > MAX_LENGTHS.description) {
      errors.description = `Description must be less than ${MAX_LENGTHS.description} characters`;
    }
  }

  if (data.owner_name) {
    const sanitized = sanitizeString(data.owner_name, MAX_LENGTHS.ownerName);
    if (sanitized && sanitized.length < 2) {
      errors.owner_name = 'Name must be at least 2 characters';
    }
  }

  if (data.owner_email) {
    if (!validateEmail(data.owner_email)) {
      errors.owner_email = 'Please enter a valid email address';
    }
  }

  if (data.owner_phone) {
    if (!validatePhone(data.owner_phone)) {
      errors.owner_phone = 'Please enter a valid phone number (10-15 digits)';
    }
  }

  if (data.photo_url) {
    if (!validateUrl(data.photo_url)) {
      errors.photo_url = 'Please enter a valid photo URL (http, https, or data URL)';
    }
  }

  if (data.size && !validateSize(data.size)) {
    errors.size = 'Size must be small, medium, or large';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}
