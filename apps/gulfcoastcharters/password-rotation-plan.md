# Supabase Database Password Rotation Plan
**Project**: rdbuwyefbgnbuhmjrizo
**Date**: December 17, 2025
**Objective**: Rotate Postgres password with zero/minimal downtime

---

## 🎯 EXECUTIVE SUMMARY

**Current Risk**: Unknown - pending inventory scan
**Recommended Approach**: Pooler-based connections for production, test rotation in dev first
**Estimated Downtime**: 0-5 minutes if properly coordinated

---

## 📋 PHASE 1: PRE-ROTATION INVENTORY

### A. Connection String Types in Supabase

Your Supabase project has THREE connection types:

1. **Direct Connection** (Port 5432)
   - Format: `postgresql://postgres:[PASSWORD]@db.rdbuwyefbgnbuhmjrizo.supabase.co:5432/postgres`
   - ⚠️ **Not IPv4 compatible** in your environment
   - Use case: Local development with IPv6, migrations, admin tasks
   - **NOT RECOMMENDED** for your Windows IPv4 network

2. **Session Pooler** (Port 5432)
   - Format: `postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-us-west-1.pooler.supabase.com:5432/postgres`
   - Connection mode: Session mode
   - Use case: Long-lived connections, transactions
   - ⚠️ May have IPv4 issues

3. **Transaction Pooler** (Port 6543) ⭐ **RECOMMENDED**
   - Format: `postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-us-west-1.pooler.supabase.com:6543/postgres`
   - Connection mode: Transaction mode
   - Use case: Serverless, short-lived connections, Vercel/Netlify
   - ✅ **Best for your setup** - IPv4 compatible, production-ready

### B. Run Inventory Scan

```powershell
cd c:\gcc\cevict-app\cevict-monorepo
.\db-connection-scanner.ps1
```

This will generate:
- `db-connection-inventory.txt` - All matches found
- `db-connection-report.md` - Organized summary

### C. Manual Review Required

For each match found, document:

| File | Variable | App/Service | Dev/Prod | Loaded From | Uses Password? |
|------|----------|-------------|----------|-------------|----------------|
| apps/gateway/.env.local | SUPABASE_DB_URL | gateway | dev | local file | ✅ YES |
| apps/gateway/server.js | SUPABASE_DB_URL | gateway | dev | env var | ✅ YES |
| .env.local | DATABASE_URL | root | dev | local file | ✅ YES |
| ... | ... | ... | ... | ... | ... |

**Key Questions:**
- Does it connect using `postgresql://` (password auth) or use Supabase client (API key)?
- Is it used at build time, runtime, or both?
- Where is the actual secret stored? (local .env, Vercel dashboard, etc.)

---

## 🔍 PHASE 2: IDENTIFY BLAST RADIUS

### Services That Will Break

Based on typical monorepo setup, likely affected:

1. **Gateway API** (`apps/gateway`)
   - Endpoint: `/health/jobs` 
   - Uses: `SUPABASE_DB_URL` or `DATABASE_URL`
   - Impact: Health check failures, cron job monitoring broken
   - Restart required: YES

2. **Prisma ORM** (if used)
   - Uses: `DATABASE_URL` or `DIRECT_URL`
   - Impact: Migrations, seeding, direct DB queries
   - Restart required: YES (dev server)

3. **Background Jobs** (if any)
   - Check: Bull, BullMQ, node-cron, or custom schedulers
   - Impact: Job processing stopped
   - Restart required: YES

4. **Local Development Servers**
   - All apps with `npm run dev` running
   - Impact: Hot reload continues, but DB queries fail
   - Restart required: YES (stop and restart dev servers)

### Services That Won't Break

- Supabase client SDK connections (use API keys, not DB password)
- Frontend apps using Supabase client only
- Edge Functions (if using Supabase client)

### Connection Type Analysis

**Current Problem**: Direct connection shows "Not IPv4 compatible"

**Recommended Fix**:
```
OLD: postgresql://postgres:[PASSWORD]@db.rdbuwyefbgnbuhmjrizo.supabase.co:5432/postgres
NEW: postgresql://postgres.rdbuwyefbgnbuhmjrizo:[PASSWORD]@aws-0-us-west-1.pooler.supabase.com:6543/postgres
```

**Benefits**:
- ✅ IPv4 compatible (works on Windows)
- ✅ Connection pooling (better performance)
- ✅ Serverless-friendly (no hanging connections)
- ✅ Production-ready

---

## 🛠️ PHASE 3: SAFE ROTATION PROCEDURE

### Strategy: Blue-Green Deployment (if supported)

If your environment supports dual credentials:
1. Add new password as `DATABASE_URL_NEW`
2. Test with new credential
3. Rotate password
4. Switch to `DATABASE_URL_NEW`
5. Remove old credential

If not supported, use **Fast Cutover** strategy below.

---

## 📝 ROTATION CHECKLIST

### 🔵 STEP 1: Preparation (Low Risk)

- [ ] **1.1** Run `db-connection-scanner.ps1` to inventory all uses
- [ ] **1.2** Document current password (save securely in password manager)
- [ ] **1.3** Identify all environments:
  - [ ] Local development (Windows machine)
  - [ ] Vercel production (if applicable)
  - [ ] Vercel preview (if applicable)
  - [ ] Other deployments?
- [ ] **1.4** Get new pooler connection string from Supabase:
  - Go to: https://supabase.com/dashboard/project/rdbuwyefbgnbuhmjrizo/settings/database
  - Copy: "Transaction pooler" URI (port 6543)
  - Format: `postgresql://postgres.rdbuwyefbgnbuhmjrizo:[OLD_PASSWORD]@aws-0-us-west-1.pooler.supabase.com:6543/postgres`
- [ ] **1.5** Test OLD pooler connection (before rotation):
  ```bash
  psql "postgresql://postgres.rdbuwyefbgnbuhmjrizo:[OLD_PASSWORD]@aws-0-us-west-1.pooler.supabase.com:6543/postgres" -c "SELECT 1;"
  ```
- [ ] **1.6** Create backup of all .env files:
  ```powershell
  Get-ChildItem -Path . -Recurse -Filter .env* | Copy-Item -Destination {$_.FullName + ".backup"}
  ```
- [ ] **1.7** Notify team (if applicable): "DB password rotation in progress"

### 🟡 STEP 2: Rotate Password (Downtime Begins)

- [ ] **2.1** Stop all local dev servers:
  ```powershell
  # Press Ctrl+C in each terminal running npm run dev
  ```
- [ ] **2.2** Go to Supabase dashboard:
  - Navigate to: Settings > Database > Database password
  - Click "Reset database password"
  - Copy new password to clipboard
  - Save new password in password manager
- [ ] **2.3** Note exact time of rotation: `__:__` (for rollback reference)

⏱️ **Downtime window starts here**

### 🟢 STEP 3: Update Connection Strings (Critical)

#### A. Update Local Environment Files

For each file found in inventory:

- [ ] **3.1** Root `.env.local`:
  ```bash
  # Update if exists:
  DATABASE_URL="postgresql://postgres.rdbuwyefbgnbuhmjrizo:[NEW_PASSWORD]@aws-0-us-west-1.pooler.supabase.com:6543/postgres"
  
  # Or if using direct URL:
  DIRECT_URL="postgresql://postgres.rdbuwyefbgnbuhmjrizo:[NEW_PASSWORD]@aws-0-us-west-1.pooler.supabase.com:6543/postgres"
  ```

- [ ] **3.2** `apps/gateway/.env.local`:
  ```bash
  SUPABASE_DB_URL="postgresql://postgres.rdbuwyefbgnbuhmjrizo:[NEW_PASSWORD]@aws-0-us-west-1.pooler.supabase.com:6543/postgres"
  ```

- [ ] **3.3** `apps/cevict/.env.local` (if exists):
  ```bash
  DATABASE_URL="postgresql://postgres.rdbuwyefbgnbuhmjrizo:[NEW_PASSWORD]@aws-0-us-west-1.pooler.supabase.com:6543/postgres"
  ```

- [ ] **3.4** `apps/petreunion/.env.local` (if exists):
  ```bash
  DATABASE_URL="postgresql://postgres.rdbuwyefbgnbuhmjrizo:[NEW_PASSWORD]@aws-0-us-west-1.pooler.supabase.com:6543/postgres"
  ```

- [ ] **3.5** Any `prisma/.env`:
  ```bash
  DATABASE_URL="postgresql://postgres.rdbuwyefbgnbuhmjrizo:[NEW_PASSWORD]@aws-0-us-west-1.pooler.supabase.com:6543/postgres"
  ```

#### B. Update Deployment Environments

- [ ] **3.6** Vercel (if applicable):
  - Go to: Project Settings > Environment Variables
  - Find: `DATABASE_URL`, `SUPABASE_DB_URL`, `DIRECT_URL`
  - Update each with new password (keep pooler format)
  - Select: Production, Preview, Development (as applicable)
  - Click "Save"

- [ ] **3.7** Other platforms:
  - Update in respective dashboards
  - Use pooler connection string

### 🔄 STEP 4: Restart Services

- [ ] **4.1** Test connection with psql:
  ```bash
  psql "postgresql://postgres.rdbuwyefbgnbuhmjrizo:[NEW_PASSWORD]@aws-0-us-west-1.pooler.supabase.com:6543/postgres" -c "SELECT 1;"
  ```
  Expected output: `1` (in table format)

- [ ] **4.2** Restart Gateway:
  ```powershell
  cd apps/gateway
  npm run dev
  ```
  Wait for: "Server listening on port 3000" (or similar)

- [ ] **4.3** Restart other apps:
  ```powershell
  # In separate terminals:
  cd apps/cevict && npm run dev
  cd apps/petreunion && npm run dev
  ```

- [ ] **4.4** Redeploy on Vercel (if env vars changed):
  ```bash
  vercel --prod
  # Or trigger redeployment from Vercel dashboard
  ```

⏱️ **Downtime window ends here**

### ✅ STEP 5: Validation

- [ ] **5.1** Test Gateway health endpoint:
  ```powershell
  curl http://localhost:3000/health
  curl http://localhost:3000/health/jobs
  ```
  Expected: Both return `200 OK` with JSON response

- [ ] **5.2** Test database queries:
  ```bash
  node test-db-connection.js
  ```

- [ ] **5.3** Check cron jobs (if applicable):
  ```sql
  SELECT * FROM cron.job;
  ```

- [ ] **5.4** Test application features:
  - [ ] User login
  - [ ] Data retrieval
  - [ ] Data creation
  - [ ] Any critical workflows

- [ ] **5.5** Monitor logs for errors:
  ```powershell
  # Check console output in each terminal
  # Look for "connection refused", "authentication failed"
  ```

- [ ] **5.6** Check production (if deployed):
  - [ ] Production health endpoint
  - [ ] Sentry/error monitoring (no new DB errors)
  - [ ] User-facing features working

### 🧹 STEP 6: Cleanup

- [ ] **6.1** Remove backup .env files (after 24-48 hours):
  ```powershell
  Get-ChildItem -Path . -Recurse -Filter .env*.backup | Remove-Item
  ```

- [ ] **6.2** Update password manager with new credential
- [ ] **6.3** Update team documentation
- [ ] **6.4** Delete old password from notes
- [ ] **6.5** Mark task complete in project tracker

---

## 🚨 ROLLBACK PLAN

### If Something Breaks (Within 1 Hour)

**Option A: Revert Password in Supabase**

⚠️ **Supabase does NOT support password rollback easily**

If you MUST rollback:
1. Go back to Supabase dashboard > Database > Reset password
2. Manually enter OLD password (from password manager)
3. May not work - Supabase typically generates random passwords

**Option B: Fix Forward (Recommended)**

1. Verify new password is correct:
   ```bash
   # Copy from Supabase dashboard
   echo "[NEW_PASSWORD]"
   ```

2. Check connection string format:
   ```bash
   # Correct format:
   postgresql://postgres.rdbuwyefbgnbuhmjrizo:[PASSWORD]@aws-0-us-west-1.pooler.supabase.com:6543/postgres
   
   # Common mistakes:
   # - Wrong port (5432 instead of 6543)
   # - Missing postgres.rdbuwyefbgnbuhmjrizo prefix
   # - Wrong region (check pooler URL in dashboard)
   ```

3. Test connection directly:
   ```bash
   psql "postgresql://postgres.rdbuwyefbgnbuhmjrizo:[NEW_PASSWORD]@aws-0-us-west-1.pooler.supabase.com:6543/postgres" -c "SELECT now();"
   ```

4. If still broken, check:
   - [ ] Is password URL-encoded? (special chars like `@`, `!`, `%` must be encoded)
   - [ ] Are there trailing spaces in .env file?
   - [ ] Is the file saved? (check timestamp)
   - [ ] Did the dev server reload? (restart it)

**Option C: Emergency Contact**

If production is down and you can't fix it:
1. Contact Supabase support: https://supabase.com/dashboard/support
2. Explain: "Rotated password, can't connect, need help"
3. Include: Project ref `rdbuwyefbgnbuhmjrizo`

---

## 🔧 SPECIAL REQUIREMENTS

### Gateway `/health/jobs` Endpoint

**File**: `apps/gateway/server.js`

**Current Implementation** (assumed):
```javascript
// Connects to Postgres to check cron jobs
app.get('/health/jobs', async (req, res) => {
  const client = new Client({
    connectionString: process.env.SUPABASE_DB_URL || process.env.DATABASE_URL
  });
  // ... queries cron.job table
});
```

**Required Configuration**:
```bash
# apps/gateway/.env.local
SUPABASE_DB_URL="postgresql://postgres.rdbuwyefbgnbuhmjrizo:[PASSWORD]@aws-0-us-west-1.pooler.supabase.com:6543/postgres"
```

**Verification**:
```bash
curl http://localhost:3000/health/jobs
```

Expected response:
```json
{
  "status": "ok",
  "jobs": [...],
  "timestamp": "2025-12-17T..."
}
```

### ⚠️ Common Mistake: Using SUPABASE_SERVICE_ROLE_KEY as Password

**WRONG**:
```javascript
// DON'T DO THIS
const password = process.env.SUPABASE_SERVICE_ROLE_KEY; // This is an API key, not DB password!
```

**CORRECT**:
```javascript
// Use the Postgres password
const connectionString = process.env.SUPABASE_DB_URL; // Contains actual DB password
```

**Verify**: Service role key starts with `eyJ...` (it's a JWT token, NOT a database password)

---

## 📊 CONNECTION STRING REFERENCE

### Format Comparison

| Type | Format | Port | Use Case |
|------|--------|------|----------|
| Direct | `postgresql://postgres:[PWD]@db.[REF].supabase.co:5432/postgres` | 5432 | ❌ Not IPv4 compatible |
| Session Pooler | `postgresql://postgres.[REF]:[PWD]@[REGION].pooler.supabase.com:5432/postgres` | 5432 | ⚠️ May have IPv4 issues |
| Transaction Pooler | `postgresql://postgres.[REF]:[PWD]@[REGION].pooler.supabase.com:6543/postgres` | 6543 | ✅ **RECOMMENDED** |

### Your Specific URLs

Replace `[PASSWORD]` with actual password:

```bash
# Transaction Pooler (RECOMMENDED)
postgresql://postgres.rdbuwyefbgnbuhmjrizo:[PASSWORD]@aws-0-us-west-1.pooler.supabase.com:6543/postgres

# Session Pooler (if needed)
postgresql://postgres.rdbuwyefbgnbuhmjrizo:[PASSWORD]@aws-0-us-west-1.pooler.supabase.com:5432/postgres

# Direct (NOT RECOMMENDED for your network)
postgresql://postgres:[PASSWORD]@db.rdbuwyefbgnbuhmjrizo.supabase.co:5432/postgres
```

### URL Encoding Special Characters

If password contains special characters, encode them:

| Character | Encoded |
|-----------|---------|
| @ | %40 |
| ! | %21 |
| # | %23 |
| $ | %24 |
| % | %25 |
| ^ | %5E |
| & | %26 |
| * | %2A |
| ( | %28 |
| ) | %29 |

Example:
```
Password: P@ss!123
Encoded:  P%40ss%21123
```

---

## 📁 FILE LOCATIONS TO CHECK

Based on typical Next.js monorepo structure:

```
cevict-monorepo/
├── .env.local                    # Root environment (check DATABASE_URL)
├── .env.development              # Dev-specific
├── .env.production               # Prod-specific (usually not committed)
├── apps/
│   ├── gateway/
│   │   ├── .env.local           # Gateway-specific (SUPABASE_DB_URL)
│   │   └── server.js            # Uses SUPABASE_DB_URL
│   ├── cevict/
│   │   └── .env.local           # Cevict app DB config
│   └── petreunion/
│       └── .env.local           # PetReunion app DB config
├── packages/
│   └── database/
│       └── .env                 # Prisma DB config
└── vercel.json                  # May reference env vars
```

---

## ⏱️ ESTIMATED TIMELINE

| Phase | Duration | Can Parallelize? |
|-------|----------|------------------|
| Inventory scan | 2-5 min | No |
| Review results | 5-10 min | No |
| Backup .env files | 1 min | No |
| Rotate password | 30 sec | No |
| Update all .env files | 3-5 min | Yes (multiple files) |
| Update Vercel vars | 2 min | No |
| Restart services | 2-3 min | Yes (multiple terminals) |
| Validation | 5-10 min | Yes (multiple tests) |
| **Total** | **20-35 min** | |
| **Actual Downtime** | **0-5 min** | (if done quickly) |

---

## 🎯 SUCCESS CRITERIA

Rotation is successful when:

- [ ] ✅ All services start without errors
- [ ] ✅ Gateway health endpoints return 200
- [ ] ✅ Database queries work from all apps
- [ ] ✅ Production deployment (if applicable) is healthy
- [ ] ✅ No authentication errors in logs
- [ ] ✅ Cron jobs are running (if applicable)
- [ ] ✅ User-facing features work normally

---

## 📞 SUPPORT CONTACTS

- **Supabase Support**: https://supabase.com/dashboard/support
- **Supabase Discord**: https://discord.supabase.com
- **Project Dashboard**: https://supabase.com/dashboard/project/rdbuwyefbgnbuhmjrizo

---

## 📝 POST-ROTATION NOTES

Date: _______________
Performed by: _______________
Duration: _______________
Issues encountered: _______________
Lessons learned: _______________

---

**Next Review**: Schedule next rotation in 90 days (March 2026)
