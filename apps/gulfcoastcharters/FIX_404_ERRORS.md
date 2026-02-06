# Fix 404 Errors for /test-tip Page

## Problem
You're seeing 404 errors for Next.js dev files like `react-refresh.js`, which means the dev server isn't serving the files correctly.

## Solution: Clear Cache and Restart

### Step 1: Stop any running dev server
Press `Ctrl+C` in the terminal where `npm run dev` is running (if any).

### Step 2: Clear the .next folder
```powershell
cd c:\cevict-live\apps\gulfcoastcharters
Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue
```

### Step 3: Clear browser cache
- **Hard refresh:** Press `Ctrl + Shift + R` (or `Ctrl + F5`)
- Or clear cache for localhost in browser settings

### Step 4: Start dev server fresh
```powershell
cd c:\cevict-live\apps\gulfcoastcharters
npm run dev
```

### Step 5: Wait for compilation
Look for this message in terminal:
```
✓ Ready in X seconds
```

### Step 6: Open the page
Go to: http://localhost:3000/test-tip

## If Port 3000 is Already in Use

The dev server will automatically use port 3001, 3002, etc.

Check the terminal output to see which port it's using, then go to:
- http://localhost:3001/test-tip (or whatever port it shows)

## Verify It's Working

1. Terminal shows: `✓ Ready`
2. Browser loads the page (not blank white screen)
3. No 404 errors in console
4. You can see the test-tip page content

## Still Not Working?

1. **Check if another app is using port 3000:**
   ```powershell
   netstat -ano | findstr ":3000"
   ```

2. **Kill the process if needed:**
   ```powershell
   Stop-Process -Id <PID> -Force
   ```
   (Replace `<PID>` with the process ID from netstat)

3. **Then restart:**
   ```powershell
   cd c:\cevict-live\apps\gulfcoastcharters
   npm run dev
   ```
