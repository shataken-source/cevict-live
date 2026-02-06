# Fix API 404 Error for /api/tips/create

## Problem
Getting `404 (Not Found)` when calling `POST /api/tips/create`

## Fixed Issues

### 1. ✅ Schema Error Fixed
- **Error:** "column bookings.booking_id does not exist"
- **Fix:** Changed query from `.or(\`id.eq.${bookingId},booking_id.eq.${bookingId}\`)` to `.eq('id', bookingId)`
- **Reason:** The `bookings` table only has `id` column, not `booking_id`

### 2. API Route Location
The route is correctly located at: `pages/api/tips/create.ts`

## Next Steps

### Option 1: Restart Dev Server (Recommended)
The dev server may need to restart to detect the route:

1. **Stop the dev server:** Press `Ctrl+C` in the terminal
2. **Restart:**
   ```powershell
   cd c:\cevict-live\apps\gulfcoastcharters
   npm run dev
   ```
3. **Wait for:** `✓ Ready`
4. **Try again:** Submit the tip form

### Option 2: Check Terminal for Errors
Look in the terminal where `npm run dev` is running for:
- TypeScript errors
- Build errors
- Route compilation errors

### Option 3: Verify Route is Accessible
Test the route directly:

```powershell
# In PowerShell (after dev server is running)
Invoke-WebRequest -Uri "http://localhost:3001/api/tips/create" -Method POST -ContentType "application/json" -Body '{"bookingId":"test","amount":10}' | Select-Object StatusCode, Content
```

Should return `405 Method Not Allowed` (not 404), which means the route exists but needs POST method.

### Option 4: Check Next.js Route Detection
Sometimes Next.js needs the file to be "touched" to detect it:

1. Open `pages/api/tips/create.ts`
2. Add a space and remove it (to trigger file change)
3. Save the file
4. Watch terminal for route compilation

## Verify It's Working

After restarting, when you submit the tip form:
- ✅ Should NOT see 404 error
- ✅ Should see API response (success or error with details)
- ✅ Check browser Network tab to see the actual response

## If Still Getting 404

1. **Check file path is exactly:** `pages/api/tips/create.ts` (not `app/api/...`)
2. **Verify export:** File must have `export default async function handler`
3. **Check for syntax errors:** Run `npm run build` to see if there are TypeScript errors
4. **Clear .next cache:**
   ```powershell
   Remove-Item -Recurse -Force .next
   npm run dev
   ```
