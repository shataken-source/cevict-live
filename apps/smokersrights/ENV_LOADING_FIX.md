# Environment Variable Loading Fix

## Problem

When running scripts with `tsx` (like `npm run update-laws`), environment variables weren't being loaded properly, causing "Supabase credentials not configured" errors.

**Root Cause:**
- Environment variables were being read at module load time (top-level constants)
- `dotenv/config` runs after modules are imported
- Variables were `undefined` when the class constructor checked them

## Solution

### 1. Fixed `lawUpdateService.ts`
- Moved env var reading **inside the constructor**
- Now reads vars after dotenv has loaded

### 2. Fixed Scripts
- All scripts now explicitly load `.env.local` first, then `.env`
- Matches Next.js behavior
- Loads before importing modules that need env vars

## Files Fixed

- ✅ `lib/bot/lawUpdateService.ts` - Read env vars in constructor
- ✅ `scripts/daily-law-update.ts` - Explicit env loading
- ✅ `scripts/populate-products.ts` - Explicit env loading
- ✅ `scripts/verify-setup.ts` - Explicit env loading

## How It Works Now

1. Script starts
2. Loads `.env.local` (if exists) with `override: true`
3. Loads `.env` (if exists) with `override: false`
4. Loads `dotenv/config` as fallback
5. **Then** imports modules that need env vars
6. Modules read env vars inside constructors/functions

## Testing

Run:
```bash
npm run update-laws
npm run populate-products
npm run verify-setup
```

All should now work correctly!

## Related to Kalshi Bot?

This same pattern could affect the Kalshi bot if it has similar issues. The alpha-hunter app already handles this correctly by:
- Loading dotenv explicitly in modules
- Reading env vars inside constructors
- Using `loadAlphaHunterSecrets()` as fallback

If Kalshi bot has env var issues, check:
1. Are env vars read at module level or in constructors?
2. Is dotenv loaded before modules that need env vars?
3. Does the script explicitly load `.env.local`?
