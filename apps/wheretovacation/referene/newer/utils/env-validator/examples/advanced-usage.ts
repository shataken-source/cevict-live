// Example of advanced usage with conditional validation and custom transforms

import { z } from 'zod';

// Advanced schema with conditional validation
const advancedEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  NEXT_PUBLIC_API_URL: z.string().url(),
  
  // Database - required in production
  DATABASE_URL: z.string().url().optional(),
  
  // Transform string to number with validation
  MAX_UPLOAD_SIZE: z.string()
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().positive().max(100 * 1024 * 1024)) // Max 100MB
    .default('5242880'), // 5MB default
  
  // Transform comma-separated string to array
  ALLOWED_ORIGINS: z.string()
    .transform((val) => val.split(',').map(s => s.trim()))
    .default('localhost:3000'),
  
  // Conditional API keys
  API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  
  // Feature flags as booleans
  ENABLE_ANALYTICS: z.string().transform((val) => val === 'true').default('false'),
  ENABLE_CACHE: z.string().transform((val) => val === 'true').default('true'),
  
  // Email configuration
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string()
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().int().min(1).max(65535))
    .optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
}).refine((data) => {
  // Database URL is required in production
  if (data.NODE_ENV === 'production' && !data.DATABASE_URL) {
    return false;
  }
  return true;
}, {
  message: "DATABASE_URL is required in production environment",
}).refine((data) => {
  // If SMTP_HOST is provided, SMTP_USER and SMTP_PASS must also be provided
  if (data.SMTP_HOST && (!data.SMTP_USER || !data.SMTP_PASS)) {
    return false;
  }
  return true;
}, {
  message: "SMTP_USER and SMTP_PASS are required when SMTP_HOST is provided",
});

// Advanced validation with custom error handling
function validateAdvancedEnv() {
  try {
    const env = advancedEnvSchema.parse(process.env);
    
    // Additional custom validations
    if (env.NODE_ENV === 'production') {
      console.log('🚀 Production environment detected');
      console.log(`✅ Database: ${env.DATABASE_URL ? 'Configured' : 'Missing'}`);
      console.log(`✅ Upload limit: ${env.MAX_UPLOAD_SIZE} bytes`);
      console.log(`✅ Allowed origins: ${env.ALLOWED_ORIGINS.join(', ')}`);
    } else {
      console.log('🛠️ Development environment detected');
    }
    
    return env;
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('\n❌ Environment validation failed:');
      
      // Group errors by type for better readability
      const missingRequired = error.errors.filter(err => err.code === 'invalid_type' && err.received === 'undefined');
      const invalidFormat = error.errors.filter(err => err.code !== 'invalid_type' || err.received !== 'undefined');
      
      if (missingRequired.length > 0) {
        console.error('\n🔍 Missing required variables:');
        missingRequired.forEach(err => {
          console.error(`  ❌ ${err.path.join('.')} is required`);
        });
      }
      
      if (invalidFormat.length > 0) {
        console.error('\n🔧 Invalid format:');
        invalidFormat.forEach(err => {
          console.error(`  ⚠️  ${err.path.join('.')}: ${err.message}`);
        });
      }
      
      console.error('\n💡 Please check your .env file and ensure all required variables are set.');
      
      if (process.env.NODE_ENV === 'production') {
        console.error('🚨 Application cannot start in production with invalid environment variables');
        process.exit(1);
      } else {
        console.warn('⚠️  Continuing in development mode with invalid environment variables');
      }
    }
    throw error;
  }
}

export const advancedEnv = validateAdvancedEnv();

// Helper functions for common use cases
export function getDatabaseConfig() {
  return {
    url: advancedEnv.DATABASE_URL,
    isProduction: advancedEnv.NODE_ENV === 'production',
  };
}

export function getApiConfig() {
  return {
    apiUrl: advancedEnv.NEXT_PUBLIC_API_URL,
    apiKey: advancedEnv.API_KEY,
    openaiApiKey: advancedEnv.OPENAI_API_KEY,
  };
}

export function getFileConfig() {
  return {
    maxUploadSize: advancedEnv.MAX_UPLOAD_SIZE,
    allowedOrigins: advancedEnv.ALLOWED_ORIGINS,
  };
}

export function getFeatureFlags() {
  return {
    analytics: advancedEnv.ENABLE_ANALYTICS,
    cache: advancedEnv.ENABLE_CACHE,
  };
}

export function getSmtpConfig() {
  return {
    host: advancedEnv.SMTP_HOST,
    port: advancedEnv.SMTP_PORT,
    user: advancedEnv.SMTP_USER,
    pass: advancedEnv.SMTP_PASS,
  };
}
