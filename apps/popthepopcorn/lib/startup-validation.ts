/**
 * Startup Validation
 * Validates environment variables and configuration on app startup
 */

import { validateEnvironment, validateEnvironmentOrThrow } from './env-validation'

/**
 * Run validation (non-blocking, logs warnings)
 */
export function validateStartup(): void {
  const result = validateEnvironment()

  if (!result.valid) {
    console.error('❌ Environment validation failed:')
    result.errors.forEach((error) => console.error(`  - ${error}`))
    console.error('\n⚠️  App may not function correctly. Please fix environment variables.')
    return
  }

  if (result.warnings.length > 0) {
    console.warn('⚠️  Environment warnings:')
    result.warnings.forEach((warning) => console.warn(`  - ${warning}`))
  }

  console.log('✅ Environment variables validated')
}

/**
 * Run validation and throw if invalid (for critical startup)
 */
export function validateStartupOrThrow(): void {
  validateEnvironmentOrThrow()
}
