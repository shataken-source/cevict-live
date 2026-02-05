export interface PasswordStrength {
  isValid: boolean;
  errors: string[];
  strength: 'weak' | 'medium' | 'strong';
}

export function validatePassword(password: string): PasswordStrength {
  const errors: string[] = [];
  let score = 0;

  if (password.length < 8) {
    errors.push('At least 8 characters required');
  } else {
    score++;
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Must contain uppercase letter');
  } else {
    score++;
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Must contain lowercase letter');
  } else {
    score++;
  }

  if (!/[0-9]/.test(password)) {
    errors.push('Must contain a number');
  } else {
    score++;
  }

  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Special character recommended');
  } else {
    score++;
  }

  let strength: 'weak' | 'medium' | 'strong' = 'weak';
  if (score >= 5) strength = 'strong';
  else if (score >= 3) strength = 'medium';

  return {
    isValid: errors.length === 0 || (errors.length === 1 && errors[0].includes('recommended')),
    errors,
    strength
  };
}
