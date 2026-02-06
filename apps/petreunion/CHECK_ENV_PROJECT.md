# Check Your Environment Variables

## Find Which Project Your App Points To

### 1. Check `.env.local` (Development)

Look for these lines:
```env
NEXT_PUBLIC_SUPABASE_URL=https://[PROJECT_REF].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[your_anon_key]
SUPABASE_SERVICE_ROLE_KEY=[your_service_key]
```

**The PROJECT_REF in the URL should match the project you're checking.**

### 2. Check Vercel Environment Variables (Production)

1. Go to **Vercel Dashboard**
2. Select your **petreunion** project
3. **Settings** → **Environment Variables**
4. Check:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`

### 3. Extract Project Reference from URL

The URL format is:
```
https://[PROJECT_REF].supabase.co
```

**Example:**
- URL: `https://abcdefghijklmnop.supabase.co`
- Project Ref: `abcdefghijklmnop`

### 4. Verify Project Match

1. **In Supabase Dashboard**, check the project URL
2. **Compare** with your `.env.local` URL
3. **If they don't match**, you're in the wrong project!

## How to Check All Projects

1. **List all Supabase projects:**
   - Go to https://supabase.com/dashboard
   - See all projects you have access to

2. **For each project:**
   - Open SQL Editor
   - Run `CHECK_ALL_PROJECTS.sql`
   - Note the results (especially PART A: pets count)

3. **Find the project with ~26,000 pets**

4. **Update your `.env.local`:**
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://[CORRECT_PROJECT_REF].supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=[key_from_correct_project]
   SUPABASE_SERVICE_ROLE_KEY=[service_key_from_correct_project]
   ```

5. **Restart your app** after updating env vars

## Quick Check Script

Run this in PowerShell to see your current project URL:

```powershell
# Check .env.local
Get-Content apps\petreunion\.env.local | Select-String "SUPABASE_URL"

# Or check environment variables
$env:NEXT_PUBLIC_SUPABASE_URL
```

## If Projects Don't Match

**If your app points to Project A but data is in Project B:**

1. **Option 1:** Update `.env.local` to point to Project B (where data is)
2. **Option 2:** Export data from Project B and import to Project A
3. **Option 3:** Use Project B for your app (if that's where data should be)

---

**PRIORITY: Run `CHECK_ALL_PROJECTS.sql` in EACH Supabase project to find which one has 26,000 pets.**
