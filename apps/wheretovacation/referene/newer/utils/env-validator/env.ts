import { z } from 'zod';

// Define environment variable schema
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  NEXT_PUBLIC_APP_URL: z.string().url().default('http://localhost:3003'),
  NEXT_PUBLIC_ENABLE_BUG_REPORTING: z.string().transform((val) => val === 'true').default('false'),
  
  // Database (if using Supabase)
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  
  // API Keys (optional for development)
  OPENAI_API_KEY: z.string().optional(),
  GOOGLE_GENERATIVE_AI_API_KEY: z.string().optional(),
  
  // Email (if using Resend)
  RESEND_API_KEY: z.string().optional(),
  RESEND_FROM_EMAIL: z.string().email().optional(),
  
  // Sentry (for error tracking)
  SENTRY_DSN: z.string().url().optional(),
  SENTRY_AUTH_TOKEN: z.string().optional(),
  
  // Other services
  NEXTAUTH_SECRET: z.string().optional(),
  NEXTAUTH_URL: z.string().url().optional(),
});

// Validate environment variables
function validateEnv() {
  try {
    const env = envSchema.parse(process.env);
    return env;
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.errors.map(err => `${err.path.join('.')}: ${err.message}`);
      console.error('❌ Invalid environment variables:');
      missingVars.forEach(err => console.error(`  - ${err}`));
      
      if (process.env.NODE_ENV === 'production') {
        console.error('🚨 Application cannot start in production with invalid environment variables');
        process.exit(1);
      } else {
        console.warn('⚠️  Running with invalid environment variables in development mode');
      }
    }
    throw error;
  }
}

// Export validated environment
export const env = validateEnv();

// Export types for TypeScript
export type Env = z.infer<typeof envSchema>;
