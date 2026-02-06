# Verify Which Database You're Connected To

## Quick Check

The app uses these environment variables:
- `NEXT_PUBLIC_SUPABASE_URL` - The Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key

## Check Your Environment Variables

1. **Check `.env.local` file** (in `apps/gulfcoastcharters/`):
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://rdbuwyefbgnbuhmjrizo.supabase.co
   ```

2. **Current project:** `rdbuwyefbgnbuhmjrizo` (PRO database)

## If Data is in Test Database

If your test data is in a different Supabase project:

### Option 1: Update Environment Variables

1. **Get test database URL:**
   - Go to your test Supabase project dashboard
   - Settings → API
   - Copy the "Project URL"

2. **Get test service role key:**
   - Same page, copy the `service_role` key

3. **Update `.env.local`:**
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://YOUR_TEST_PROJECT.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your_test_service_role_key
   ```

4. **Restart dev server:**
   ```powershell
   # Stop current server (Ctrl+C)
   cd c:\cevict-live\apps\gulfcoastcharters
   npm run dev
   ```

### Option 2: Check Both Databases

Run `CHECK_CURRENT_DATABASE.sql` in:
1. **PRO database** (`rdbuwyefbgnbuhmjrizo`)
2. **Test database** (whatever your test project ID is)

See which one has the data!

## Common Project IDs

Based on your codebase:
- **PRO:** `rdbuwyefbgnbuhmjrizo` (current)
- **FREE/TEST:** `nqkbqtiramecvmmpaxzk` (mentioned in petreunion scripts)

## Quick Test

Open browser console on `http://localhost:3000/captains` and run:
```javascript
// Check which Supabase URL is being used
console.log(process.env.NEXT_PUBLIC_SUPABASE_URL);
```

Or check the Network tab → look at API requests → see the Supabase URL in the request headers.
