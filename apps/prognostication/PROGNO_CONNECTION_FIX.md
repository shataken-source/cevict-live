# Progno Admin Page Connection Fix

## Issue Fixed

The Progno admin page was showing "Disconnected" with "URL: Not set" because:
1. The admin page (client component) was trying to read `process.env.NEXT_PUBLIC_PROGNO_BASE_URL` directly
2. Client components can't access server-side environment variables
3. The API route uses `PROGNO_BASE_URL` (server-side only)

## Solution Applied

### 1. Updated API Route (`app/api/picks/today/route.ts`)
- Added `prognoUrl` to the API response
- Returns the PROGNO URL from the server-side environment variable
- Includes URL even when no picks are available

### 2. Updated Admin Page (`app/admin/page.tsx`)
- Removed direct `process.env` access
- Now reads `prognoUrl` from the API response
- Better error messages based on connection status:
  - "PROGNO not configured or unavailable" - when source is 'unavailable'
  - "PROGNO connected but no picks available" - when connected but empty
  - "PROGNO_BASE_URL environment variable not set" - when URL is missing

## Environment Variable Required

Set this in your `.env.local` or Vercel environment variables:

```env
PROGNO_BASE_URL=https://progno.vercel.app
```

Or for local development:
```env
PROGNO_BASE_URL=http://localhost:3008
```

## How It Works Now

1. Admin page calls `/api/picks/today`
2. API route reads `PROGNO_BASE_URL` from server-side env
3. API attempts to fetch picks from PROGNO
4. API returns response with:
   - `source`: 'progno' | 'unavailable' | 'progno-empty'
   - `prognoUrl`: The configured PROGNO URL (or null)
   - `picks`: The actual picks data
5. Admin page displays connection status based on API response

## Status Display

- ✅ **Connected** (green) - When `source === 'progno'` and picks are available
- ❌ **Disconnected** (red) - When:
  - `source === 'unavailable'` (PROGNO not configured or unreachable)
  - `source === 'progno-empty'` (Connected but no picks)
  - API call failed

## Testing

1. Set `PROGNO_BASE_URL` in environment variables
2. Visit `/admin` page
3. Click "Refresh" button
4. Check connection status:
   - Should show "✅ Connected" if PROGNO is reachable
   - Should show the PROGNO URL
   - Should display picks if available

---

**All files have been updated and saved to disk!**

