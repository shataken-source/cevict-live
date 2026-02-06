# Update Supabase Configuration

## Current Issue

The `smokersrights` app needs to use the correct Supabase project URL that matches your dashboard.

## Correct Configuration

Update your `.env.local` file in `apps/smokersrights/` with these values:

```bash
# Supabase Project URL (CORRECT - matches your dashboard)
NEXT_PUBLIC_SUPABASE_URL=https://rdbuwyefbgnbuhmjrizo.supabase.co

# Service Role Key (get from Supabase Dashboard > Settings > API > service_role key)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... (your full 200+ char key)

# Anon Key (optional, for frontend)
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... (your anon key)
```

## Steps to Update

1. **Open `.env.local` file:**
   ```bash
   # Location: apps/smokersrights/.env.local
   ```

2. **Update the URL:**
   - Find: `NEXT_PUBLIC_SUPABASE_URL=https://nqkbqtiramecvmmpaxzk.supabase.co` (or any other URL)
   - Replace with: `NEXT_PUBLIC_SUPABASE_URL=https://rdbuwyefbgnbuhmjrizo.supabase.co`

3. **Verify Service Role Key:**
   - Make sure `SUPABASE_SERVICE_ROLE_KEY` is set
   - Get it from: Supabase Dashboard > Settings > API > `service_role` key
   - Should be 200+ characters long

4. **Test the update:**
   ```bash
   cd apps/smokersrights
   npm run verify-setup
   npm run update-laws
   ```

## Verification

After updating, run:
```bash
npm run verify-setup
```

You should see:
- ✅ Environment Variables: All required env vars are set
- ✅ Database Connection: Successfully connected to Supabase
- ✅ Laws Table: Found X+ laws

## Important Notes

- **Your Project:** This is your Supabase project (`rdbuwyefbgnbuhmjrizo`) shown in the dashboard
- **Service Role Key Required:** The service role key is needed for updating laws (anon key can't update)
- **Get Keys from Dashboard:** Go to Settings > API in your Supabase dashboard to get both keys
- **Don't Commit:** Never commit `.env.local` to git (it should be in `.gitignore`)

## Quick Check

To verify your current URL without opening the file:
```bash
cd apps/smokersrights
node -e "require('dotenv').config({path:'.env.local'}); console.log('URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)"
```
