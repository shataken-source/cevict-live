# Start Next.js Dev Server

## Quick Start

```powershell
cd c:\cevict-live\apps\gulfcoastcharters
npm run dev
```

## What to Expect

1. **First time:** It will take 30-60 seconds to compile
2. **You'll see:** `✓ Ready in X seconds`
3. **Then open:** http://localhost:3000/test-tip

## If Port 3000 is Busy

The dev server will automatically try port 3001, 3002, etc.

Check the terminal output to see which port it's using.

## Clear Build Cache (if needed)

If you're still seeing 404 errors after starting:

```powershell
cd c:\cevict-live\apps\gulfcoastcharters
Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue
npm run dev
```

## Verify It's Running

1. Check terminal for: `✓ Ready`
2. Open browser: http://localhost:3000
3. Should see your app (not 404)
