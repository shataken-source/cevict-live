# E2E Testing Guide

## Overview
This project uses Playwright for end-to-end testing. Tests run automatically in CI/CD pipelines before production deployments.

## Running Tests Locally

### Install Dependencies
```bash
npm install
npx playwright install --with-deps
```

### Run All Tests
```bash
npm run test
```

### Run Tests with UI
```bash
npm run test:ui
```

### Run Tests in Headed Mode
```bash
npm run test:headed
```

### Debug Tests
```bash
npm run test:debug
```

## Test Structure

Tests are located in `tests/e2e/`:
- `auth.spec.ts` - Authentication and homepage tests
- `booking.spec.ts` - Booking flow tests
- `payment.spec.ts` - Payment processing tests
- `visual-regression.spec.ts` - Visual regression tests

## CI/CD Integration

### Automatic Test Execution
Tests run automatically on:
- Pull requests to `main` or `develop`
- Pushes to `main` branch
- Production deployments

### Skipping Tests in Emergency
If you need to deploy urgently and tests are failing:

```bash
# Using GitHub Actions UI
# Go to Actions → Deploy to Production → Run workflow
# Set "Skip tests" to "true"
```

Or push with workflow dispatch:
```bash
gh workflow run deploy-production.yml -f skip-tests=true
```

## Common Test Failures

### 1. Element Not Found
**Error**: `Timeout waiting for selector`
**Solution**: 
- Ensure data-testid attributes exist on components
- Check if component is rendered conditionally
- Increase timeout if loading is slow

### 2. Server Not Starting
**Error**: `webServer.url is not available`
**Solution**:
- Check if port 5173 is already in use
- Ensure `npm run dev` works locally
- Check environment variables

### 3. Database Connection Issues
**Error**: Tests fail due to Supabase errors
**Solution**:
- Verify VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
- Use test database or mock data
- Check RLS policies

## Writing New Tests

### Basic Test Structure
```typescript
import { test, expect } from '@playwright/test';

test.describe('Feature Name', () => {
  test('should do something', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('[data-testid="element"]')).toBeVisible();
  });
});
```

### Best Practices
1. Use data-testid for stable selectors
2. Wait for elements before interacting
3. Use descriptive test names
4. Clean up test data after tests
5. Keep tests independent

## Debugging Failed Tests in CI

### View Test Reports
1. Go to GitHub Actions
2. Click on failed workflow
3. Download "playwright-report" artifact
4. Extract and open `index.html`

### View Screenshots
1. Download "test-screenshots" artifact
2. Review failure screenshots
3. Compare with expected behavior

## Test Configuration

Configuration in `playwright.config.ts`:
- **testDir**: `./tests/e2e`
- **retries**: 2 in CI, 0 locally
- **workers**: 1 in CI (parallel locally)
- **browsers**: Chromium, Firefox, WebKit, Mobile

## Troubleshooting

### Tests Pass Locally but Fail in CI
- Check environment variables in GitHub Secrets
- Verify CI has correct Node.js version
- Check for timing issues (add waits)
- Review CI logs for specific errors

### Slow Tests
- Reduce number of browsers tested
- Use `test.only()` for specific tests
- Optimize test setup/teardown
- Consider parallel execution

### Flaky Tests
- Add explicit waits
- Use `waitForLoadState('networkidle')`
- Increase timeouts for slow operations
- Check for race conditions

## Related Files
- `playwright.config.ts` - Playwright configuration
- `tests/e2e/*.spec.ts` - Test files
- `.github/workflows/deploy-production.yml` - CI/CD workflow
- `package.json` - Test scripts
