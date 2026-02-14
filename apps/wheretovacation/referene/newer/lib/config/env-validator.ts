/**
 * Environment Variable Validation
 * Ensures all required environment variables are present and valid
 */

interface EnvConfig {
  [key: string]: {
    required: boolean;
    type?: 'string' | 'number' | 'boolean' | 'url';
    default?: string | number | boolean;
    validator?: (value: string) => boolean;
  };
}

const envConfig: EnvConfig = {
  // Supabase
  NEXT_PUBLIC_SUPABASE_URL: {
    required: true,
    type: 'url',
    validator: (v) => v.startsWith('https://') && v.includes('.supabase.co')
  },
  NEXT_PUBLIC_SUPABASE_ANON_KEY: {
    required: true,
    type: 'string',
    validator: (v) => v.length > 50
  },
  SUPABASE_SERVICE_ROLE_KEY: {
    required: false, // Only needed server-side
    type: 'string',
    validator: (v) => v.length > 50
  },
  
  // Backup
  BACKUP_ENCRYPTION_KEY: {
    required: false,
    type: 'string',
    default: 'default-backup-key-change-in-production',
    validator: (v) => v.length >= 32
  },
  
  // Optional APIs
  TWILIO_ACCOUNT_SID: { required: false, type: 'string' },
  TWILIO_AUTH_TOKEN: { required: false, type: 'string' },
  STRIPE_SECRET_KEY: { required: false, type: 'string' },
  SENDGRID_API_KEY: { required: false, type: 'string' },
  
  // App Config
  NODE_ENV: {
    required: true,
    type: 'string',
    default: 'development',
    validator: (v) => ['development', 'production', 'test'].includes(v)
  },
  NEXT_PUBLIC_SITE_URL: {
    required: false,
    type: 'url',
    default: 'http://localhost:3002'
  }
};

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  missing: string[];
}

export function validateEnv(): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const missing: string[] = [];

  for (const [key, config] of Object.entries(envConfig)) {
    const value = process.env[key];
    
    // Check if required
    if (config.required && !value) {
      if (config.default) {
        process.env[key] = String(config.default);
        warnings.push(`${key} is missing, using default: ${config.default}`);
      } else {
        missing.push(key);
        errors.push(`${key} is required but not set`);
      }
      continue;
    }

    // Skip validation if not set and not required
    if (!value) continue;

    // Type validation
    if (config.type === 'number' && isNaN(Number(value))) {
      errors.push(`${key} must be a number, got: ${value}`);
    }

    if (config.type === 'boolean' && !['true', 'false', '1', '0'].includes(value.toLowerCase())) {
      errors.push(`${key} must be a boolean, got: ${value}`);
    }

    if (config.type === 'url' && !value.match(/^https?:\/\/.+/)) {
      errors.push(`${key} must be a valid URL, got: ${value}`);
    }

    // Custom validator
    if (config.validator && !config.validator(value)) {
      errors.push(`${key} failed validation`);
    }

    // Security warnings
    if (key.includes('SECRET') || key.includes('KEY') || key.includes('PASSWORD')) {
      if (value === config.default || value.includes('example') || value.includes('test')) {
        warnings.push(`${key} appears to be using a default/test value`);
      }
    }
  }

  return {
    valid: errors.length === 0 && missing.length === 0,
    errors,
    warnings,
    missing
  };
}

export function getEnv(key: string, defaultValue?: string): string {
  const value = process.env[key];
  if (!value && defaultValue) {
    return defaultValue;
  }
  if (!value) {
    throw new Error(`Environment variable ${key} is not set`);
  }
  return value;
}

// Validate on import in production
if (process.env.NODE_ENV === 'production') {
  const result = validateEnv();
  if (!result.valid) {
    console.error('❌ Environment validation failed:');
    result.errors.forEach(err => console.error(`  - ${err}`));
    result.missing.forEach(key => console.error(`  - Missing: ${key}`));
    throw new Error('Environment validation failed. Please check your .env file.');
  }
  if (result.warnings.length > 0) {
    console.warn('⚠️ Environment warnings:');
    result.warnings.forEach(warn => console.warn(`  - ${warn}`));
  }
}












