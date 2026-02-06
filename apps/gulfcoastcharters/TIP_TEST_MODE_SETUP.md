# Tip Payment Test Mode Setup

## ⚠️ IMPORTANT: DEV ONLY - NEVER ENABLE IN PRODUCTION

This test mode allows you to test the tip payment flow without authentication.

## Setup

1. **Add to `.env.local`** (development only):
   ```bash
   ALLOW_TIP_TEST_MODE=true
   ```

2. **Test mode will ONLY work when:**
   - `ALLOW_TIP_TEST_MODE=true` is set in environment
   - Request includes header `x-test-mode: true`
   - Request is from `localhost` or `127.0.0.1`
   - OR request is to `/test-tip` route

3. **What test mode bypasses:**
   - User authentication (uses test user ID)
   - Booking ownership verification
   - Trip completion timing (2-hour wait)

## Usage

The test mode is automatically enabled when:
- You're on the `/test-tip` page
- The request includes the `x-test-mode: true` header (automatically added by PostTripTipping component on test page)

## Security

- Test mode **only works on localhost**
- Test mode **requires environment variable**
- Test mode **logs warnings** when active
- Test mode **is disabled by default** (must explicitly enable)

## Production Deployment

**BEFORE DEPLOYING TO PRODUCTION:**
1. Remove or set `ALLOW_TIP_TEST_MODE=false` in production environment
2. Verify test mode is not active in production logs
3. Test that authentication is required in production

## Testing with Real Data

For production-like testing:
1. Log in as a real user
2. Use a real `booking_id` from your database
3. Ensure booking is completed and 2+ hours have passed
4. Don't set `ALLOW_TIP_TEST_MODE` (or set to `false`)
