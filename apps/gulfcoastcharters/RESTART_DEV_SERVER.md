# Restart Dev Server to See test-tip Page

The `/test-tip` page exists but Next.js needs to be restarted to pick it up.

## Quick Fix:

1. **Stop the dev server** (if running):
   - Press `Ctrl+C` in the terminal where `npm run dev` is running

2. **Restart the dev server**:
   ```bash
   cd apps/gulfcoastcharters
   npm run dev
   ```

3. **Wait for compilation** - You should see:
   ```
   ✓ Ready in X seconds
   ○ Compiling /test-tip ...
   ✓ Compiled /test-tip in X ms
   ```

4. **Navigate to**: http://localhost:3000/test-tip

## If Still Not Working:

1. **Clear Next.js cache**:
   ```bash
   rm -rf .next
   npm run dev
   ```

2. **Check the terminal** for any compilation errors

3. **Verify the file exists**: `pages/test-tip.tsx`
