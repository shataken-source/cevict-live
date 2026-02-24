// Example of basic usage for a simple Next.js project

import { z } from 'zod';

// Define your project's environment variables
const basicEnvSchema = z.object({
  // Required variables
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  NEXT_PUBLIC_API_URL: z.string().url(),
  
  // Optional variables
  NEXT_PUBLIC_ANALYTICS_ID: z.string().optional(),
  DATABASE_URL: z.string().url().optional(),
});

// Validation function
function validateBasicEnv() {
  try {
    const env = basicEnvSchema.parse(process.env);
    return env;
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('❌ Environment validation failed:');
      error.errors.forEach(err => {
        console.error(`  ${err.path.join('.')}: ${err.message}`);
      });
      
      if (process.env.NODE_ENV === 'production') {
        process.exit(1);
      }
    }
    throw error;
  }
}

export const basicEnv = validateBasicEnv();

// Usage in your app
export function getApiConfig() {
  return {
    apiUrl: basicEnv.NEXT_PUBLIC_API_URL,
    isProduction: basicEnv.NODE_ENV === 'production',
    analyticsId: basicEnv.NEXT_PUBLIC_ANALYTICS_ID,
  };
}
