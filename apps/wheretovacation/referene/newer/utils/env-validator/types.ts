// Re-export types for external use
export type { Env } from './env';

import { z } from 'zod';

// Common environment variable patterns that can be reused
export const commonEnvVars = {
  // Core Next.js
  NODE_ENV: 'development' as const,
  NEXT_PUBLIC_APP_URL: '',
  NEXT_PUBLIC_ENABLE_BUG_REPORTING: false,
  
  // Database
  DATABASE_URL: '',
  NEXT_PUBLIC_SUPABASE_URL: '',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: '',
  SUPABASE_SERVICE_ROLE_KEY: '',
  
  // APIs
  API_KEY: '',
  OPENAI_API_KEY: '',
  GOOGLE_GENERATIVE_AI_API_KEY: '',
  
  // Email
  RESEND_API_KEY: '',
  RESEND_FROM_EMAIL: '',
  
  // Error Tracking
  SENTRY_DSN: '',
  SENTRY_AUTH_TOKEN: '',
  
  // Auth
  NEXTAUTH_SECRET: '',
  NEXTAUTH_URL: '',
} as const;

// Helper function to create environment variable schemas
export function createEnvSchema<T extends Record<string, any>>(schema: z.ZodSchema<T>) {
  return schema;
}

// Common validation patterns
export const patterns = {
  url: z.string().url(),
  email: z.string().email(),
  positiveNumber: z.string().transform(Number).pipe(z.number().positive()),
  boolean: z.string().transform((val) => val === 'true'),
  commaSeparatedList: z.string().transform((val) => val.split(',')),
  optionalUrl: z.string().url().optional(),
  optionalEmail: z.string().email().optional(),
};
