/**
 * Environment Variable Validation
 * Validates required environment variables on startup
 */

interface EnvVar {
  name: string
  required: boolean
  description: string
  validator?: (value: string) => boolean
  errorMessage?: string
}

const REQUIRED_ENV_VARS: EnvVar[] = [
  {
    name: 'NEXT_PUBLIC_SUPABASE_URL',
    required: true,
    description: 'Supabase project URL',
    validator: (v) => v.startsWith('https://') && v.includes('.supabase.co'),
    errorMessage: 'Must be a valid Supabase URL (https://*.supabase.co)',
  },
  {
    name: 'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    required: true,
    description: 'Supabase anonymous key',
    validator: (v) => v.length > 20,
    errorMessage: 'Must be a valid Supabase key',
  },
  {
    name: 'ADMIN_PASSWORD',
    required: true,
    description: 'Admin password (minimum 12 characters)',
    validator: (v) => v.length >= 12,
    errorMessage: 'Must be at least 12 characters long',
  },
]

const OPTIONAL_ENV_VARS: EnvVar[] = [
  {
    name: 'SUPABASE_SERVICE_ROLE_KEY',
    required: false,
    description: 'Supabase service role key (for admin operations)',
  },
  {
    name: 'STRIPE_SECRET_KEY',
    required: false,
    description: 'Stripe secret key (for payments)',
  },
  {
    name: 'STRIPE_WEBHOOK_SECRET',
    required: false,
    description: 'Stripe webhook signing secret',
  },
  {
    name: 'CRON_SECRET',
    required: false,
    description: 'Secret for cron job authentication',
  },
  {
    name: 'PERPLEXITY_API_KEY',
    required: false,
    description: 'Perplexity API key (for AI verification)',
  },
  {
    name: 'SINCH_API_TOKEN',
    required: false,
    description: 'Sinch API token (for SMS alerts)',
  },
]

export interface ValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
}

/**
 * Validate all environment variables
 */
export function validateEnvironment(): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  // Check required variables
  for (const envVar of REQUIRED_ENV_VARS) {
    const value = process.env[envVar.name]

    if (!value) {
      errors.push(
        `Missing required environment variable: ${envVar.name} - ${envVar.description}`
      )
      continue
    }

    if (envVar.validator && !envVar.validator(value)) {
      errors.push(
        `Invalid ${envVar.name}: ${envVar.errorMessage || 'Validation failed'}`
      )
    }
  }

  // Check for insecure defaults
  if (process.env.ADMIN_PASSWORD === 'admin123') {
    errors.push(
      'ADMIN_PASSWORD cannot be the default "admin123". Set a secure password in environment variables.'
    )
  }

  // Warn about missing optional but recommended variables
  for (const envVar of OPTIONAL_ENV_VARS) {
    if (!process.env[envVar.name]) {
      warnings.push(
        `Optional environment variable not set: ${envVar.name} - ${envVar.description}`
      )
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  }
}

/**
 * Validate and throw if invalid (for startup)
 */
export function validateEnvironmentOrThrow(): void {
  const result = validateEnvironment()

  if (!result.valid) {
    console.error('❌ Environment validation failed:')
    result.errors.forEach((error) => console.error(`  - ${error}`))
    throw new Error('Environment validation failed. See errors above.')
  }

  if (result.warnings.length > 0) {
    console.warn('⚠️  Environment warnings:')
    result.warnings.forEach((warning) => console.warn(`  - ${warning}`))
  }

  console.log('✅ Environment variables validated')
}
