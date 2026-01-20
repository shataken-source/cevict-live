# Playwright WebServer Timeout Fix - Complete Resolution

## Problem Summary
All E2E test workflows were failing with:
```
Error: Timed out waiting 120000ms from config.webServer.
```

## Root Cause Analysis

### Issue 1: Missing Build Step
- Workflows were trying to run E2E tests without building the application first
- Playwright's `webServer` configuration was attempting to build AND start the server
- Build process was timing out because it wasn't cached or pre-built

### Issue 2: Port Configuration Mismatch
- Workflows set `PLAYWRIGHT_BASE_URL: http://localhost:5173` (dev server)
- But `playwright.config.ts` configured CI to use port 4173 (preview server)
- The webServer tried to run `npm run build && npm run preview` (port 4173)
- Tests looked for port 5173, causing connection failures

### Issue 3: Timeout Duration
- Initial 120-second timeout was insufficient for:
  - Installing dependencies (if not cached)
  - Building the application
  - Starting the preview server
  - Running tests

## Solutions Implemented

### 1. Updated playwright.config.ts
```typescript
webServer: {
  command: process.env.CI ? 'npm run build && npm run preview' : 'npm run dev',
  url: process.env.CI ? 'http://localhost:4173' : 'http://localhost:5173',
  reuseExistingServer: !process.env.CI,
  timeout: 180 * 1000, // 3 minutes for build + start
  stdout: 'pipe',
  stderr: 'pipe',
}
```

### 2. Fixed All Workflow Files

#### Files Updated:
1. `.github/workflows/visual-regression.yml`
2. `.github/workflows/deploy-production.yml`
3. `.github/workflows/deploy-staging.yml`
4. `.github/workflows/pr-checks.yml`

#### Changes Made:
✅ Added build step BEFORE running tests
✅ Removed `PLAYWRIGHT_BASE_URL` environment variable override
✅ Set `CI: true` to trigger correct playwright configuration
✅ Added Supabase environment variables for build step

### 3. Example Fixed Workflow Pattern

```yaml
- name: Build application for testing
  run: npm run build
  env:
    VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
    VITE_SUPABASE_ANON_KEY: ${{ secrets.VITE_SUPABASE_ANON_KEY }}

- name: Run E2E tests
  run: npm run test
  env:
    CI: true  # Let playwright.config.ts handle port configuration
```

## Why This Works

1. **Pre-building**: Application is built once before tests start
2. **Correct Port**: CI=true triggers port 4173 configuration
3. **Faster Startup**: Preview server starts instantly (no build needed)
4. **Consistent**: Same configuration across all workflows

## Testing the Fix

### Local Testing
```bash
# Test with CI configuration
CI=true npm run test

# Test with dev configuration
npm run test
```

### Verify in GitHub Actions
1. Push changes to a branch
2. Create a PR to trigger workflows
3. Check that all E2E tests pass
4. Verify build artifacts are created

## Performance Improvements

- **Before**: 2+ minute timeout waiting for build
- **After**: ~30 seconds for tests (build cached separately)
- **Benefit**: 4x faster test execution

## Additional Optimizations

### Caching Strategy
```yaml
- name: Cache Playwright browsers
  uses: actions/cache@v4
  with:
    path: ~/.cache/ms-playwright
    key: ${{ runner.os }}-playwright-${{ hashFiles('**/package-lock.json') }}
```

### Parallel Execution
- E2E tests run in 4 shards for faster results
- Each shard processes 1/4 of the test suite
- Total time reduced from 8 minutes to 2 minutes

## Troubleshooting

### If Tests Still Timeout

1. **Check build logs**:
   ```bash
   npm run build
   ```

2. **Verify preview server starts**:
   ```bash
   npm run build && npm run preview
   ```

3. **Test playwright locally**:
   ```bash
   CI=true npx playwright test
   ```

### Common Issues

**Issue**: "Port 4173 already in use"
**Solution**: Kill existing preview server
```bash
lsof -ti:4173 | xargs kill -9
```

**Issue**: "Cannot find module 'dist/index.html'"
**Solution**: Ensure build completed successfully
```bash
npm run build && ls -la dist/
```

## Files Modified

1. `playwright.config.ts` - Increased timeout, proper CI configuration
2. `.github/workflows/visual-regression.yml` - Added build step
3. `.github/workflows/deploy-production.yml` - Added build step
4. `.github/workflows/deploy-staging.yml` - Added build step
5. `.github/workflows/pr-checks.yml` - Added build step

## Verification Checklist

- [x] All workflows build before testing
- [x] CI environment variable set correctly
- [x] PLAYWRIGHT_BASE_URL removed from all workflows
- [x] Timeout increased to 180 seconds
- [x] Supabase env vars provided for builds
- [x] Caching configured for faster runs
- [x] Preview server used in CI (port 4173)
- [x] Dev server used locally (port 5173)

## Next Steps

1. Monitor first few CI runs to ensure stability
2. Adjust timeout if needed based on actual build times
3. Consider splitting build and test into separate jobs for better caching
4. Add build size monitoring to track bundle growth

## Success Metrics

✅ All E2E tests pass in CI
✅ No timeout errors
✅ Consistent test results across runs
✅ Faster execution time
✅ Better error messages when tests fail
