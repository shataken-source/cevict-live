# Switch to Test Database

## Update Environment Variables

Your app needs to point to the test database: `https://nqkbqtiramecvmmpaxzk.supabase.co`

### Step 1: Get Test Database Credentials

1. **Go to:** https://supabase.com/dashboard/project/nqkbqtiramecvmmpaxzk/settings/api
2. **Copy these values:**
   - **Project URL:** `https://nqkbqtiramecvmmpaxzk.supabase.co`
   - **anon/public key:** (starts with `eyJ...`)
   - **service_role key:** (starts with `eyJ...`)

### Step 2: Update `.env.local`

Open `apps/gulfcoastcharters/.env.local` and update:

```env
# Test Database
NEXT_PUBLIC_SUPABASE_URL=https://nqkbqtiramecvmmpaxzk.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_test_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_test_service_role_key_here
```

### Step 3: Restart Dev Server

1. **Stop current server:** Press `Ctrl+C` in the terminal
2. **Restart:**
   ```powershell
   cd c:\cevict-live\apps\gulfcoastcharters
   npm run dev
   ```

### Step 4: Verify

1. **Open:** http://localhost:3000/captains
2. **Should now show:** Captains/boats from the test database!

## Quick Check

After updating, you can verify by:
- Opening browser console on `/captains` page
- Check Network tab → API requests → should see `nqkbqtiramecvmmpaxzk.supabase.co` in the URLs

## Note

The Edge Functions (webhook, checkout, etc.) are still deployed to the PRO database (`rdbuwyefbgnbuhmjrizo`). If you need to test those too, you'll need to:
1. Deploy functions to the test database, OR
2. Keep using PRO for webhooks but test database for frontend data
