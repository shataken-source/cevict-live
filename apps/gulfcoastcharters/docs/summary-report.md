# 📊 DATABASE PASSWORD ROTATION - COMPLETE REPORT
**Project**: rdbuwyefbgnbuhmjrizo  
**Generated**: December 17, 2025  
**Status**: Ready for execution

---

## 🎯 EXECUTIVE SUMMARY

### Current Situation
- **Project**: Supabase project `rdbuwyefbgnbuhmjrizo`
- **Issue**: Direct connection shows "Not IPv4 compatible"
- **Solution**: Rotate password + switch to Transaction Pooler
- **Risk Level**: Medium (requires careful coordination)
- **Estimated Time**: 20-35 minutes total, 0-10 minutes downtime

### Deliverables Provided
1. ✅ Automated scanning script (`db-connection-scanner.ps1`)
2. ✅ Comprehensive rotation plan (`password-rotation-plan.md`)
3. ✅ Quick reference card (`quick-reference.md`)
4. ✅ Connection test script (`test-db-connection.js`)
5. ✅ Semi-automated rotation assistant (`rotate-db-password.ps1`)
6. ✅ This summary report

---

## 📋 A) INVENTORY OF DATABASE CONNECTION USAGE

### How to Complete Inventory

**Step 1**: Run the scanning script
```powershell
cd c:\gcc\cevict-app\cevict-monorepo
.\db-connection-scanner.ps1
```

This will generate:
- `db-connection-inventory.txt` - CSV with all findings
- `db-connection-report.md` - Markdown summary

**Step 2**: Fill in the table below with results

### Inventory Template

| File Path | Variable Name | App/Service | Dev/Prod | Loaded From | Uses Password? | Notes |
|-----------|---------------|-------------|----------|-------------|----------------|-------|
| `.env.local` | `DATABASE_URL` | root | dev | local file | ✅ YES | Likely Prisma |
| `apps/gateway/.env.local` | `SUPABASE_DB_URL` | gateway | dev | local file | ✅ YES | Used by /health/jobs |
| `apps/gateway/server.js` | `SUPABASE_DB_URL` | gateway | runtime | env var | ✅ YES | Code reference |
| `apps/cevict/.env.local` | `DATABASE_URL` | cevict | dev | local file | ⚠️ MAYBE | Check if used |
| `apps/petreunion/.env.local` | `DATABASE_URL` | petreunion | dev | local file | ⚠️ MAYBE | Check if used |
| _(add more rows as needed)_ | | | | | | |

**Legend**:
- **App/Service**: Which application uses this (gateway, cevict, petreunion, shared, root)
- **Dev/Prod**: Development, Production, or Both
- **Loaded From**: Local .env file, Vercel dashboard, environment variable, etc.
- **Uses Password?**: 
  - ✅ YES = Connects with `postgresql://` (password-based)
  - ❌ NO = Uses Supabase client SDK (API key-based)
  - ⚠️ MAYBE = Unclear, needs verification

### Common Patterns to Look For

1. **Prisma Schema** (`prisma/schema.prisma`):
   ```prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }
   ```

2. **Direct DB Queries** (Node.js):
   ```javascript
   const { Client } = require('pg');
   const client = new Client({
     connectionString: process.env.DATABASE_URL
   });
   ```

3. **Gateway Health Check** (`apps/gateway/server.js`):
   ```javascript
   app.get('/health/jobs', async (req, res) => {
     // Uses SUPABASE_DB_URL or DATABASE_URL
   });
   ```

4. **Supabase Client** (DOES NOT use password):
   ```javascript
   import { createClient } from '@supabase/supabase-js';
   const supabase = createClient(
     process.env.NEXT_PUBLIC_SUPABASE_URL,
     process.env.SUPABASE_ANON_KEY  // API key, NOT password
   );
   ```

---

## 🎯 B) BLAST RADIUS ANALYSIS

### Services That WILL Break (Must Update)

Based on typical monorepo architecture:

| Service | Component | Impact | Restart Needed |
|---------|-----------|--------|----------------|
| **Gateway API** | `apps/gateway/server.js` | `/health/jobs` endpoint fails | ✅ YES |
| **Prisma Migrations** | `prisma/` folder | Cannot run migrations/seeding | ✅ YES |
| **Direct DB Scripts** | Any `.js/.ts` files using `pg` library | Queries fail | ✅ YES |
| **Local Dev Servers** | All `npm run dev` processes | DB queries fail | ✅ YES |
| **Background Jobs** | If using direct DB connection | Job processing stops | ✅ YES |

### Services That WON'T Break (No Action Needed)

| Service | Reason |
|---------|--------|
| Frontend apps using Supabase client | Uses API keys, not DB password |
| Supabase Auth | Managed by Supabase, not affected |
| Supabase Storage | Managed by Supabase, not affected |
| Edge Functions | If using Supabase client SDK |
| Next.js API routes | If using Supabase client SDK |

### Critical Dependencies

```
Database Password Change
    ↓
Direct PostgreSQL Connections Break
    ↓
    ├── Gateway /health/jobs endpoint
    ├── Prisma CLI commands
    ├── Background jobs (if any)
    └── Direct DB query scripts
```

### Answer to Key Question

**"Resetting the DB password will break X, Y, Z unless updated."**

Based on typical setup:
> Resetting the DB password will break:
> - ✅ Gateway `/health/jobs` endpoint (uses `SUPABASE_DB_URL`)
> - ✅ Prisma migrations/seeding (uses `DATABASE_URL`)
> - ✅ Any custom scripts using `pg` library with `DATABASE_URL`
> - ✅ Local development servers that query the database directly
> 
> Unless these environment variables are updated with the new password:
> - `SUPABASE_DB_URL` in `apps/gateway/.env.local`
> - `DATABASE_URL` in root `.env.local`
> - `DATABASE_URL` in Vercel (if deployed)
> - Any other `.env.local` files in apps/

---

## 🔌 C) CORRECT CONNECTION METHOD

### Current Problem

Your environment shows: **"Not IPv4 compatible"** for direct connection.

This means:
- ❌ Cannot use: `db.rdbuwyefbgnbuhmjrizo.supabase.co:5432`
- ❌ Reason: Direct connection requires IPv6
- ✅ Solution: Use Transaction Pooler with IPv4 support

### Connection Types Available

| Type | URL Format | Port | IPv4? | Recommended For |
|------|-----------|------|-------|-----------------|
| **Direct** | `postgresql://postgres:[PWD]@db.[REF].supabase.co:5432/postgres` | 5432 | ❌ NO | Admin tasks (with IPv6) |
| **Session Pooler** | `postgresql://postgres.[REF]:[PWD]@[REGION].pooler.supabase.com:5432/postgres` | 5432 | ⚠️ MAYBE | Long transactions |
| **Transaction Pooler** | `postgresql://postgres.[REF]:[PWD]@[REGION].pooler.supabase.com:6543/postgres` | 6543 | ✅ YES | **Serverless, IPv4** |

### ⭐ RECOMMENDED: Transaction Pooler

**For Local Development (Windows IPv4 network)**:
```
postgresql://postgres.rdbuwyefbgnbuhmjrizo:[PASSWORD]@aws-0-us-west-1.pooler.supabase.com:6543/postgres
```

**For Production Deployments (Vercel/Netlify)**:
```
postgresql://postgres.rdbuwyefbgnbuhmjrizo:[PASSWORD]@aws-0-us-west-1.pooler.supabase.com:6543/postgres
```

**Why Transaction Pooler?**
- ✅ IPv4 compatible (works on Windows)
- ✅ Connection pooling (better performance)
- ✅ Serverless-friendly (auto-closes idle connections)
- ✅ No hanging connections
- ✅ Best for Next.js/Vercel deployments

### Connection String Components

```
postgresql://postgres.rdbuwyefbgnbuhmjrizo:[PASSWORD]@aws-0-us-west-1.pooler.supabase.com:6543/postgres
             ^^^^^^^^                      ^^^^^^^^^^  ^^^^^^^^^^^^^^^^                      ^^^^
             username                      password    pooler hostname                       port
             (includes project ref)
```

**Key Differences from Direct Connection**:
1. Username: `postgres.rdbuwyefbgnbuhmjrizo` (not just `postgres`)
2. Host: `aws-0-us-west-1.pooler.supabase.com` (not `db.*.supabase.co`)
3. Port: `6543` (not `5432`)

---

## 📝 D) PASSWORD ROTATION RUNBOOK

### Strategy: Fast Cutover with Minimal Downtime

**Goal**: Rotate password in <10 minutes of actual downtime

### Pre-Rotation Checklist (5 minutes, NO downtime)

- [ ] **1.1** Run inventory scan:
  ```powershell
  cd c:\gcc\cevict-app\cevict-monorepo
  .\db-connection-scanner.ps1
  ```

- [ ] **1.2** Review scan results and identify all .env files

- [ ] **1.3** Backup all .env files:
  ```powershell
  Get-ChildItem -Recurse -Filter .env* | Copy-Item -Destination {$_.FullName + ".backup"}
  ```

- [ ] **1.4** Test current connection:
  ```powershell
  node test-db-connection.js
  ```
  Expected: All green ✅

- [ ] **1.5** Document current password (save in password manager)

- [ ] **1.6** Prepare new connection string format:
  ```
  postgresql://postgres.rdbuwyefbgnbuhmjrizo:[NEW_PASSWORD]@aws-0-us-west-1.pooler.supabase.com:6543/postgres
  ```

- [ ] **1.7** Notify team: "Starting DB password rotation"

### Rotation Procedure (10 minutes, DOWNTIME)

⏱️ **DOWNTIME STARTS**

- [ ] **2.1** Stop all local development servers:
  ```powershell
  # Press Ctrl+C in each terminal running:
  # - apps/gateway: npm run dev
  # - apps/cevict: npm run dev
  # - apps/petreunion: npm run dev
  ```

- [ ] **2.2** Rotate password in Supabase:
  - Go to: https://supabase.com/dashboard/project/rdbuwyefbgnbuhmjrizo/settings/database
  - Click: "Reset database password"
  - Copy new password to clipboard
  - Save in password manager
  - Note time: `____:____`

- [ ] **2.3** Update local .env files:
  ```powershell
  # Either manually edit each file, or run:
  .\rotate-db-password.ps1 -NewPassword "your-new-password"
  ```
  
  Files to update:
  - `.env.local` → `DATABASE_URL`
  - `apps/gateway/.env.local` → `SUPABASE_DB_URL`
  - `apps/cevict/.env.local` → `DATABASE_URL` (if exists)
  - `apps/petreunion/.env.local` → `DATABASE_URL` (if exists)

- [ ] **2.4** Update Vercel environment variables (if deployed):
  - Go to: Vercel Project Settings > Environment Variables
  - Update: `DATABASE_URL` and/or `SUPABASE_DB_URL`
  - New value: Transaction Pooler URL with new password
  - Save

- [ ] **2.5** Restart local services:
  ```powershell
  # Terminal 1
  cd apps\gateway && npm run dev
  
  # Terminal 2
  cd apps\cevict && npm run dev
  
  # Terminal 3 (if applicable)
  cd apps\petreunion && npm run dev
  ```

⏱️ **DOWNTIME ENDS** (when services are back up)

### Validation (5 minutes, NO downtime)

- [ ] **3.1** Test database connection:
  ```powershell
  node test-db-connection.js
  ```
  Expected: All green ✅

- [ ] **3.2** Test Gateway health endpoints:
  ```powershell
  curl http://localhost:3000/health
  curl http://localhost:3000/health/jobs
  ```
  Expected: Both return 200 OK

- [ ] **3.3** Manual verification commands:
  ```powershell
  # Connect with psql
  psql "postgresql://postgres.rdbuwyefbgnbuhmjrizo:[NEW_PASSWORD]@aws-0-us-west-1.pooler.supabase.com:6543/postgres"
  
  # Run test queries:
  SELECT 1;
  SELECT NOW();
  SELECT COUNT(*) FROM cron.job;  -- if pg_cron exists
  ```

- [ ] **3.4** Check application features:
  - [ ] User login works
  - [ ] Data retrieval works
  - [ ] Data creation works
  - [ ] No errors in console logs

- [ ] **3.5** Verify production (if deployed):
  - [ ] Trigger Vercel redeployment (if env vars changed)
  - [ ] Test production health endpoint
  - [ ] Check Sentry/error logs (no new DB errors)

- [ ] **3.6** Monitor for 15-30 minutes:
  - Watch console logs
  - Check for "authentication failed" errors
  - Verify no connection issues

### Post-Rotation Cleanup (after 24-48 hours)

- [ ] **4.1** Remove backup .env files:
  ```powershell
  Get-ChildItem -Recurse -Filter .env*.backup | Remove-Item
  ```

- [ ] **4.2** Update team documentation

- [ ] **4.3** Delete old password from notes

- [ ] **4.4** Schedule next rotation (90 days)

---

## 🚨 E) ROLLBACK PLAN

### Scenario 1: Connection Fails Immediately

**Problem**: Services can't connect after rotation

**Solution**: Fix forward (DON'T try to rollback password)

1. **Verify password is correct**:
   ```powershell
   # Copy from Supabase dashboard again
   # Paste into password manager
   # Double-check for typos
   ```

2. **Check connection string format**:
   ```
   ✅ CORRECT:
   postgresql://postgres.rdbuwyefbgnbuhmjrizo:[PASSWORD]@aws-0-us-west-1.pooler.supabase.com:6543/postgres
   
   ❌ WRONG (common mistakes):
   postgresql://postgres:[PASSWORD]@db.rdbuwyefbgnbuhmjrizo.supabase.co:5432/postgres
   (missing "postgres." prefix, wrong host, wrong port)
   ```

3. **Check for URL encoding issues**:
   ```powershell
   # If password has special characters, encode them:
   # @ → %40
   # ! → %21
   # # → %23
   # etc.
   ```

4. **Test connection directly**:
   ```bash
   psql "postgresql://postgres.rdbuwyefbgnbuhmjrizo:[PASSWORD]@aws-0-us-west-1.pooler.supabase.com:6543/postgres" -c "SELECT 1;"
   ```

5. **Check .env file saved**:
   ```powershell
   Get-ChildItem .env.local | Select-Object Name, LastWriteTime
   # Verify LastWriteTime is recent
   ```

6. **Restart dev server** (sometimes needed for env changes):
   ```powershell
   # Stop with Ctrl+C
   # Start again with: npm run dev
   ```

### Scenario 2: Some Services Work, Others Don't

**Problem**: Inconsistent behavior across services

**Checklist**:
- [ ] Did you update ALL .env files? (check inventory)
- [ ] Did you update Vercel? (if deployed)
- [ ] Did you restart ALL dev servers?
- [ ] Are there multiple .env files? (.env.local, .env, .env.development)
- [ ] Did a dev server cache old env vars? (try full restart)

### Scenario 3: Emergency Rollback of .env Files

**When**: If you need to quickly restore old configuration

```powershell
# Restore all .env files from backups
Get-ChildItem -Recurse -Filter .env*.backup | ForEach-Object {
    $OriginalFile = $_.FullName.Replace('.backup', '')
    Copy-Item $_.FullName -Destination $OriginalFile -Force
    Write-Host "Restored: $OriginalFile"
}

# Restart services
cd apps\gateway && npm run dev
```

**⚠️ IMPORTANT**: You CANNOT easily rollback the Supabase password itself. Supabase generates random passwords and doesn't support reverting to previous ones. If you restore .env files, you'll have the OLD password in your config, but Supabase will be using the NEW password - this won't work!

### Scenario 4: Production is Down

**Immediate Actions**:

1. **Check Vercel deployment logs**:
   - Go to: Vercel Dashboard > Deployments > Latest
   - Look for database connection errors

2. **Verify Vercel env vars**:
   - Go to: Project Settings > Environment Variables
   - Check `DATABASE_URL` has new password
   - Check format is correct (Transaction Pooler)

3. **Trigger redeployment**:
   ```bash
   vercel --prod
   ```

4. **Contact Supabase support** (if needed):
   - URL: https://supabase.com/dashboard/support
   - Include: Project ref `rdbuwyefbgnbuhmjrizo`
   - Issue: "Password rotation, unable to connect"

### Recovery Commands

```powershell
# Test current connection
node test-db-connection.js

# Test specific connection string
$env:DATABASE_URL = "postgresql://postgres.rdbuwyefbgnbuhmjrizo:[PASSWORD]@aws-0-us-west-1.pooler.supabase.com:6543/postgres"
node test-db-connection.js

# Check which processes are running
Get-Process node

# Kill all node processes (nuclear option)
Get-Process node | Stop-Process -Force

# Start fresh
cd apps\gateway
npm run dev
```

---

## 🔧 F) SPECIAL REQUIREMENT: Gateway `/health/jobs`

### Current Implementation

**File**: `apps/gateway/server.js`

**Expected Code** (verify this is present):
```javascript
const { Client } = require('pg');

app.get('/health/jobs', async (req, res) => {
  try {
    // Use SUPABASE_DB_URL or fall back to DATABASE_URL
    const connectionString = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;
    
    if (!connectionString) {
      return res.status(500).json({
        status: 'error',
        message: 'Database connection string not configured'
      });
    }
    
    const client = new Client({ connectionString });
    await client.connect();
    
    // Query cron jobs
    const result = await client.query('SELECT * FROM cron.job');
    
    await client.end();
    
    res.json({
      status: 'ok',
      jobs: result.rows,
      count: result.rows.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});
```

### Required Configuration

**File**: `apps/gateway/.env.local`

```bash
# Gateway-specific database connection
SUPABASE_DB_URL="postgresql://postgres.rdbuwyefbgnbuhmjrizo:[PASSWORD]@aws-0-us-west-1.pooler.supabase.com:6543/postgres"

# Other Supabase config (these use API keys, NOT passwords)
NEXT_PUBLIC_SUPABASE_URL="https://rdbuwyefbgnbuhmjrizo.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGci..."
SUPABASE_SERVICE_ROLE_KEY="eyJhbGci..."
```

### ⚠️ Common Mistakes

**WRONG** (DON'T DO THIS):
```javascript
// NEVER use service role key as database password
const password = process.env.SUPABASE_SERVICE_ROLE_KEY;  // ❌ This is a JWT token!
const connectionString = `postgresql://postgres:${password}@...`;  // ❌ Won't work
```

**CORRECT**:
```javascript
// Use the dedicated database URL
const connectionString = process.env.SUPABASE_DB_URL;  // ✅ Contains actual DB password
```

### How to Verify

**Key Identifier**:
- Service role key starts with: `eyJ...` (it's a JWT token)
- Database password: Random alphanumeric string (e.g., `k3jh4g2j3h4...`)

**Test the Endpoint**:
```powershell
# Start gateway
cd apps\gateway
npm run dev

# Test in another terminal
curl http://localhost:3000/health/jobs
```

**Expected Response**:
```json
{
  "status": "ok",
  "jobs": [
    {
      "jobid": 1,
      "schedule": "0 * * * *",
      "command": "...",
      ...
    }
  ],
  "count": 1,
  "timestamp": "2025-12-17T12:34:56.789Z"
}
```

**Error Response** (if connection fails):
```json
{
  "status": "error",
  "message": "connection refused" // or "authentication failed"
}
```

---

## 📊 SUMMARY CHECKLIST

### Before Rotation
- [ ] ✅ Inventory scan completed
- [ ] ✅ All .env files identified
- [ ] ✅ Backups created
- [ ] ✅ Team notified
- [ ] ✅ Test scripts ready

### During Rotation
- [ ] ✅ Dev servers stopped
- [ ] ✅ Password rotated in Supabase
- [ ] ✅ All .env files updated
- [ ] ✅ Vercel variables updated
- [ ] ✅ Services restarted

### After Rotation
- [ ] ✅ Connection tests pass
- [ ] ✅ Health endpoints work
- [ ] ✅ Application features verified
- [ ] ✅ Production deployed (if applicable)
- [ ] ✅ Monitoring for 30 minutes

### Cleanup
- [ ] ✅ Remove backups (after 24-48h)
- [ ] ✅ Update documentation
- [ ] ✅ Schedule next rotation

---

## 📞 SUPPORT & RESOURCES

### Supabase Resources
- **Dashboard**: https://supabase.com/dashboard/project/rdbuwyefbgnbuhmjrizo
- **Database Settings**: https://supabase.com/dashboard/project/rdbuwyefbgnbuhmjrizo/settings/database
- **Support**: https://supabase.com/dashboard/support
- **Discord**: https://discord.supabase.com
- **Docs**: https://supabase.com/docs

### Files Provided
1. `db-connection-scanner.ps1` - Inventory scanner
2. `password-rotation-plan.md` - Detailed 15-page plan
3. `quick-reference.md` - Quick reference card
4. `test-db-connection.js` - Connection validator
5. `rotate-db-password.ps1` - Semi-automated rotation
6. `summary-report.md` - This file

### Recommended Tools
- **PostgreSQL Client**: https://www.postgresql.org/download/
  - For running `psql` commands
- **Node.js**: Already installed (for test scripts)
- **VS Code**: For editing .env files
- **Password Manager**: For storing credentials securely

---

## 🎯 SUCCESS METRICS

**Rotation is successful when**:

| Metric | Target | How to Verify |
|--------|--------|---------------|
| Connection Test | All pass | `node test-db-connection.js` → All ✅ |
| Gateway Health | 200 OK | `curl localhost:3000/health` |
| Gateway Jobs | 200 OK | `curl localhost:3000/health/jobs` |
| Dev Servers | Running | No errors in console |
| Production | Healthy | Vercel deployment success |
| Error Rate | Zero | No new DB errors in logs |
| Downtime | <10 min | Time from stop to restart |

---

## 📝 NEXT STEPS

### Immediate (Now)
1. ✅ Review this report
2. ✅ Run `db-connection-scanner.ps1`
3. ✅ Complete inventory table (Section A)
4. ✅ Review rotation plan (`password-rotation-plan.md`)

### Soon (This Week)
1. ⏳ Schedule rotation window (low-traffic time)
2. ⏳ Notify team members
3. ⏳ Perform rotation following checklist
4. ⏳ Validate and monitor

### Later (Ongoing)
1. 📅 Schedule next rotation (90 days from now)
2. 📅 Update team documentation
3. 📅 Review and improve process

---

**Report End**

For questions or issues, refer to:
- Detailed plan: `password-rotation-plan.md`
- Quick reference: `quick-reference.md`
- Supabase support: https://supabase.com/dashboard/support

---

*Last updated: December 17, 2025*
*Project: rdbuwyefbgnbuhmjrizo*
*Version: 1.0*
