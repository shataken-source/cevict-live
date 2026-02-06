# Troubleshooting Guide

## Common Issues and Solutions

### ❌ "Invalid API key" Error

**Problem:**
```
Failed to fetch laws: Invalid API key
```

**Cause:**
- Using the wrong Supabase key (anon key instead of service role key)
- Service role key is missing or incorrect
- Key doesn't have UPDATE permissions

**Solution:**

1. **Get your Service Role Key:**
   - Go to Supabase Dashboard
   - Settings > API
   - Copy the `service_role` key (NOT the `anon` key)
   - It should be 200+ characters long

2. **Add to `.env.local`:**
   ```bash
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... (your full key)
   ```

3. **Verify it's set:**
   ```bash
   npm run verify-setup
   ```

**Important:** 
- The `anon` key can only READ data
- The `service_role` key can READ and UPDATE data
- For law updates, you MUST use `service_role` key

---

### ❌ "Supabase credentials not configured"

**Problem:**
```
Error: Supabase credentials not configured
```

**Cause:**
- Environment variables not loaded
- `.env.local` file missing or in wrong location
- Script can't find env file

**Solution:**

1. **Check `.env.local` exists:**
   ```bash
   # Should be in apps/smokersrights/.env.local
   ls apps/smokersrights/.env.local
   ```

2. **Verify variables are set:**
   ```bash
   # In .env.local, you should have:
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   ```

3. **Run from correct directory:**
   ```bash
   cd apps/smokersrights
   npm run update-laws
   ```

---

### ❌ "Products already exist" Warning

**Problem:**
```
⚠️  Products already exist in database.
   Use --overwrite flag to replace existing products.
```

**Solution:**
```bash
npm run populate-products -- --overwrite
```

This will delete existing products and insert new ones.

---

### ❌ "No laws found to update"

**Problem:**
```
No laws found to update
```

**Cause:**
- `laws` table is empty
- Laws haven't been populated yet

**Solution:**

1. **Check if laws exist:**
   ```sql
   SELECT COUNT(*) FROM laws;
   ```

2. **If empty, populate laws:**
   - Use Supabase dashboard to import laws
   - Or use your law import script
   - Or manually add laws via SQL

---

### ❌ "Products table does not exist"

**Problem:**
```
Products table does not exist - run migrations first
```

**Solution:**

1. **Create products table in Supabase:**
   ```sql
   CREATE TABLE products (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     name TEXT NOT NULL,
     description TEXT,
     price TEXT,
     category TEXT,
     link TEXT NOT NULL,
     sponsor BOOLEAN DEFAULT false,
     commission TEXT,
     active BOOLEAN DEFAULT true,
     image_url TEXT,
     created_at TIMESTAMPTZ DEFAULT NOW(),
     updated_at TIMESTAMPTZ DEFAULT NOW()
   );
   ```

2. **Or run migrations:**
   ```bash
   # If you have migrations in supabase/migrations/
   supabase db push
   ```

---

### ⚠️ "Assertion failed" Error (Windows)

**Problem:**
```
Assertion failed: !(handle->flags & UV_HANDLE_CLOSING), file src\win\async.c, line 76
```

**Cause:**
- Known issue with Node.js/tsx on Windows
- Usually happens after an error
- Doesn't affect functionality

**Solution:**
- Ignore it - it's a harmless Windows-specific warning
- The script should still complete successfully
- If it doesn't, check the actual error message above it

---

## Environment Variable Checklist

Ensure these are set in `.env.local`:

```bash
# Required
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... (200+ chars)

# Optional
ADMIN_PASSWORD=your-admin-password
BOT_SECRET_TOKEN=your-bot-secret (for API auth)
```

## Verification Steps

1. **Check env vars are loaded:**
   ```bash
   npm run verify-setup
   ```

2. **Test law updates:**
   ```bash
   npm run update-laws
   ```

3. **Test product population:**
   ```bash
   npm run populate-products
   ```

4. **Check database directly:**
   - Go to Supabase Dashboard > Table Editor
   - Verify `laws` table has data
   - Verify `products` table has data (after running populate)

## Still Having Issues?

1. **Check logs:**
   - Look for the actual error message (not just the assertion)
   - Check what the script says before failing

2. **Verify Supabase connection:**
   ```bash
   # Test connection manually
   curl https://your-project.supabase.co/rest/v1/laws?select=id&limit=1 \
     -H "apikey: YOUR_SERVICE_ROLE_KEY" \
     -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY"
   ```

3. **Check Supabase permissions:**
   - Service role key should have full access
   - Check RLS (Row Level Security) policies
   - Service role bypasses RLS, but check if table exists

4. **Review error messages:**
   - "Invalid API key" = wrong key or missing
   - "relation does not exist" = table missing
   - "permission denied" = wrong key type (using anon instead of service role)
