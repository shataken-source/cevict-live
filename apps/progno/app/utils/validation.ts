// Validation utilities for Progno Sports Prediction Platform

export function sanitizeInput(input: string): string {
  if (!input) return '';

  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/javascript:/gi, '') // Remove potential JavaScript
    .replace(/on\w+=/gi, '') // Remove event handlers
    .substring(0, 1000); // Limit length
}

export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

export function isValidPhoneNumber(phone: string): boolean {
  const phoneRegex = /^\+?[\d\s\-\(\)]+$/;
  return phoneRegex.test(phone) && phone.replace(/\D/g, '').length >= 10;
}

export function sanitizeQuestion(question: string): string {
  return sanitizeInput(question)
    .replace(/[?!]+/g, '?') // Normalize question marks
    .replace(/\s+/g, ' ') // Normalize spaces
    .trim();
}

export function validateSport(sport: string): boolean {
  const validSports = [
    'football', 'basketball', 'baseball', 'soccer', 'hockey',
    'tennis', 'golf', 'nascar', 'mma', 'boxing',
    'cricket', 'rugby', 'volleyball', 'swimming', 'track'
  ];

  return validSports.includes(sport.toLowerCase());
}

export function validateTimeframe(timeframe: string): boolean {
  const validTimeframes = [
    'today', 'tonight', 'tomorrow', 'this week', 'next week',
    'this month', 'next month', 'this year', 'season'
  ];

  return validTimeframes.includes(timeframe.toLowerCase());
}

export function validateConfidence(confidence: number): boolean {
  return confidence >= 0 && confidence <= 1;
}

export function validatePrediction(prediction: string): boolean {
  if (!prediction || prediction.trim().length === 0) return false;
  if (prediction.length > 500) return false; // Reasonable length limit

  // Check for potentially harmful content
  const harmfulPatterns = [
    /javascript:/gi,
    /<script/gi,
    /on\w+=/gi
  ];

  return !harmfulPatterns.some(pattern => pattern.test(prediction));
}
