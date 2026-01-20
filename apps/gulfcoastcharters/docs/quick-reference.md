# 🚀 QUICK REFERENCE: Database Password Rotation

## 📋 Pre-Flight Checklist (5 minutes)

```powershell
# 1. Scan codebase
cd c:\gcc\cevict-app\cevict-monorepo
.\db-connection-scanner.ps1

# 2. Backup .env files
Get-ChildItem -Recurse -Filter .env* | Copy-Item -Destination {$_.FullName + ".backup"}

# 3. Stop all dev servers (Ctrl+C in each terminal)

# 4. Test current connection
node test-db-connection.js
```

## 🔄 Rotation Steps (10 minutes)

### 1️⃣ Rotate Password
- Go to: https://supabase.com/dashboard/project/rdbuwyefbgnbuhmjrizo/settings/database
- Click: "Reset database password"
- Copy new password
- Save in password manager

### 2️⃣ Update Connection Strings

**Format to use (Transaction Pooler - port 6543):**
```
postgresql://postgres.rdbuwyefbgnbuhmjrizo:[NEW_PASSWORD]@aws-0-us-west-1.pooler.supabase.com:6543/postgres
```

**Files to update:**
```bash
# Root
.env.local → DATABASE_URL

# Gateway
apps/gateway/.env.local → SUPABASE_DB_URL

# Other apps (if they exist)
apps/cevict/.env.local → DATABASE_URL
apps/petreunion/.env.local → DATABASE_URL
```

### 3️⃣ Update Vercel (if applicable)
- Go to: Vercel Dashboard > Project Settings > Environment Variables
- Update: `DATABASE_URL` and/or `SUPABASE_DB_URL`
- Save and redeploy

### 4️⃣ Restart Services
```powershell
# Terminal 1
cd apps/gateway
npm run dev

# Terminal 2
cd apps/cevict
npm run dev

# Terminal 3 (if applicable)
cd apps/petreunion
npm run dev
```

### 5️⃣ Validate
```powershell
# Test connections
node test-db-connection.js

# Test gateway health
curl http://localhost:3000/health
curl http://localhost:3000/health/jobs
```

## ❌ Troubleshooting

### Connection Failed?

**Check 1: Password Encoding**
```powershell
# If password has special chars (@, !, #, etc.), URL encode them:
# @ = %40, ! = %21, # = %23, $ = %24, % = %25
```

**Check 2: Port Number**
```powershell
# Should be 6543 for Transaction Pooler
# NOT 5432 (that's Direct/Session)
postgresql://postgres.rdbuwyefbgnbuhmjrizo:[PASSWORD]@aws-0-us-west-1.pooler.supabase.com:6543/postgres
                                                                                          ^^^^
```

**Check 3: Format**
```powershell
# Correct format:
postgresql://postgres.rdbuwyefbgnbuhmjrizo:[PASSWORD]@aws-0-us-west-1.pooler.supabase.com:6543/postgres
             ^^^^^^^                       ^          ^                                    ^

# Common mistakes:
# ❌ Missing "postgres." prefix before project ref
# ❌ Using "db.rdbuwyefbgnbuhmjrizo.supabase.co" (direct connection)
# ❌ Wrong port (5432 instead of 6543)
```

**Check 4: File Saved?**
```powershell
# Verify .env.local was actually saved
Get-ChildItem .env.local | Select-Object LastWriteTime
```

**Check 5: Dev Server Reloaded?**
```powershell
# Stop (Ctrl+C) and restart the dev server
# Some env changes require full restart
```

## 🔙 Rollback

**If things break completely:**

1. Restore .env backups:
```powershell
Get-ChildItem -Recurse -Filter .env*.backup | ForEach-Object {
    Copy-Item $_.FullName -Destination $_.FullName.Replace('.backup', '') -Force
}
```

2. You CANNOT easily rollback the Supabase password
   - Fix forward by verifying the new password is correct
   - Double-check connection string format

## 📞 Emergency Contacts

- **Supabase Support**: https://supabase.com/dashboard/support
- **Supabase Discord**: https://discord.supabase.com

## ✅ Success Indicators

- [ ] `node test-db-connection.js` → All green ✅
- [ ] `curl http://localhost:3000/health` → 200 OK
- [ ] `curl http://localhost:3000/health/jobs` → 200 OK
- [ ] All dev servers running without errors
- [ ] No "authentication failed" in logs

## 📊 Connection String Cheat Sheet

| What | Format |
|------|--------|
| ✅ **Use This** | `postgresql://postgres.rdbuwyefbgnbuhmjrizo:[PWD]@aws-0-us-west-1.pooler.supabase.com:6543/postgres` |
| ❌ Don't Use | `postgresql://postgres:[PWD]@db.rdbuwyefbgnbuhmjrizo.supabase.co:5432/postgres` |

Key differences:
- Pooler uses: `postgres.[REF]` as username
- Pooler uses: `pooler.supabase.com` as host
- Pooler uses: port `6543` (Transaction mode)
- Direct uses: `postgres` as username (won't work on IPv4)

## 🎯 Expected Timeline

- Pre-flight: 5 min
- Rotation: 2 min ⚠️ DOWNTIME
- Updates: 5 min ⚠️ DOWNTIME
- Restart: 3 min ⚠️ DOWNTIME
- Validation: 5 min
- **Total**: 20 minutes
- **Actual Downtime**: ~10 minutes

---

**Last Updated**: December 17, 2025
**Project**: rdbuwyefbgnbuhmjrizo
