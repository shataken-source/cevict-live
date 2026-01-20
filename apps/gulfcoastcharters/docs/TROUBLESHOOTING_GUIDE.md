# 🔧 TROUBLESHOOTING GUIDE

## Quick Reference

This guide helps you diagnose and fix common issues quickly.

---

## 🚨 Critical Issues (Immediate Action Required)

### Issue: Site Down / 500 Errors

**Symptoms:**
- Users cannot access site
- 500 Internal Server Error
- All endpoints failing

**Quick Fix:**
```bash
# 1. Check service status
curl -I https://[your-domain].com/api/health

# 2. Check Supabase status
curl -I https://[project].supabase.co/rest/v1/

# 3. Restart services (if self-hosted)
pm2 restart all

# 4. Check logs
supabase functions logs --tail
```

**Root Causes:**
1. **Database connection exhausted**
   ```sql
   SELECT count(*) FROM pg_stat_activity;
   -- If > 90, increase pool size or restart
   ```

2. **Edge function error**
   ```bash
   supabase functions logs catch-of-the-day --limit 50
   # Look for errors
   ```

3. **Environment variable missing**
   ```bash
   env | grep SUPABASE
   # Verify all required vars present
   ```

**Solution Steps:**
```bash
# Step 1: Restore database connections
psql $DATABASE_URL -c "
  SELECT pg_terminate_backend(pid) 
  FROM pg_stat_activity 
  WHERE datname = current_database()
    AND pid <> pg_backend_pid()
    AND state = 'idle'
    AND state_change < current_timestamp - INTERVAL '10 minutes';
"

# Step 2: Redeploy functions
supabase functions deploy catch-of-the-day
supabase functions deploy fishing-buddy-finder

# Step 3: Clear cache
redis-cli FLUSHALL  # If using Redis

# Step 4: Verify
curl https://[your-domain].com/api/health
```

---

### Issue: Data Loss / Corruption

**Symptoms:**
- Missing inspections
- Corrupted signatures
- Broken image links

**STOP IMMEDIATELY:**
```bash
# 1. Stop all writes
# 2. Create emergency backup
pg_dump $DATABASE_URL > emergency-backup-$(date +%s).sql

# 3. Check backup integrity
psql $DATABASE_URL -f emergency-backup-*.sql --dry-run

# 4. Do NOT continue until backup verified
```

**Diagnosis:**
```sql
-- Check for missing data
SELECT COUNT(*) FROM safety_inspections WHERE signature_url IS NULL;
SELECT COUNT(*) FROM trip_photos WHERE thumbnail_url IS NULL;

-- Check for orphaned records
SELECT i.id FROM safety_inspections i
LEFT JOIN vessels v ON i.vessel_id = v.id
WHERE v.id IS NULL;
```

**Recovery:**
```bash
# If you have backup from before issue:
psql $DATABASE_URL < backup-[date].sql

# If no backup:
# Contact support immediately
# Document what happened
# Preserve logs
```

---

## ⚠️ High Priority Issues

### Issue: Connection Pool Exhausted

**Error Message:**
```
Error: too many clients already
Error: remaining connection slots are reserved
```

**Quick Check:**
```sql
SELECT 
  count(*) as total,
  count(*) FILTER (WHERE state = 'active') as active,
  count(*) FILTER (WHERE state = 'idle') as idle
FROM pg_stat_activity;
```

**If total > 80:**

**Immediate Fix:**
```typescript
// In lib/connectionPool.ts
const pool = new Pool({
  max: 150,  // Increase from 100
  idleTimeoutMillis: 5000  // Decrease from 30000
});
```

**Long-term Fix:**
```typescript
// Add connection monitoring
setInterval(() => {
  const stats = pool.getStats();
  if (stats.totalConnections > 120) {
    logger.warn('High connection count', stats);
    // Alert ops team
  }
}, 30000);
```

**Kill Idle Connections:**
```sql
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE state = 'idle'
  AND state_change < current_timestamp - INTERVAL '5 minutes'
  AND pid <> pg_backend_pid();
```

---

### Issue: Rate Limiting False Positives

**Symptoms:**
- Legitimate users getting 429 errors
- `X-RateLimit-Remaining: 0` too quickly

**Check Current Limits:**
```typescript
// View in middleware/rateLimiter.ts
const limits = {
  public: 100,      // per 15 min
  authenticated: 1000,
  premium: 5000
};
```

**Temporary Relief:**
```typescript
// Whitelist specific IPs
const limiter = createRateLimiter({
  skip: (req) => {
    const whitelist = ['192.168.1.1', '10.0.0.1'];
    return whitelist.includes(req.ip);
  }
});
```

**Permanent Fix:**
```typescript
// Increase limits for authenticated users
const userLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: (req) => {
    if (req.user?.role === 'admin') return 10000;
    if (req.user?.premium) return 5000;
    if (req.user) return 2000;  // Increased from 1000
    return 100;
  }
});
```

---

### Issue: Slow Image Loading

**Symptoms:**
- Images taking 3+ seconds to load
- Timeouts on image uploads

**Check Image Sizes:**
```sql
SELECT 
  AVG(CAST(metadata->>'size' AS integer)) as avg_size,
  MAX(CAST(metadata->>'size' AS integer)) as max_size,
  COUNT(*) as total
FROM trip_photos;
```

**If avg_size > 1MB:**

**Fix Image Optimizer:**
```typescript
// In lib/imageOptimizer.ts
const optimizerConfig = {
  quality: 80,  // Decrease from 85
  maxWidth: 1600,  // Decrease from 1920
  progressive: true
};
```

**Recompress Existing Images:**
```typescript
// Run migration script
import { imageOptimizer } from './lib/imageOptimizer';

const photos = await db.query('SELECT * FROM trip_photos');
for (const photo of photos.rows) {
  const reoptimized = await imageOptimizer.optimizeExisting(photo.full_url);
  await db.query(
    'UPDATE trip_photos SET full_url = $1 WHERE id = $2',
    [reoptimized.url, photo.id]
  );
}
```

---

### Issue: Offline Sync Failures

**Symptoms:**
- Inspections not syncing to server
- Encryption errors in console
- Data stuck in IndexedDB

**Check IndexedDB:**
```javascript
// In browser console
const request = indexedDB.open('gulf_coast_inspections');
request.onsuccess = (e) => {
  const db = e.target.result;
  const tx = db.transaction('inspections', 'readonly');
  const store = tx.objectStore('inspections');
  const countReq = store.count();
  countReq.onsuccess = () => {
    console.log('Offline inspections:', countReq.result);
  };
};
```

**If count > 100:**

**Clear Old Data:**
```typescript
import { offlineInspectionStorage } from '@/lib/offlineInspectionStorage';

// Clear inspections older than 30 days
await offlineInspectionStorage.clearOldInspections(30);
```

**Force Sync:**
```typescript
// Manually trigger sync
const results = await offlineInspectionStorage.syncToServer();
console.log('Synced:', results.success, 'Failed:', results.failed);

// If failures, check:
results.errors.forEach(error => {
  console.error('Failed sync:', error.inspectionId, error.error);
});
```

**Fix Encryption Issues:**
```typescript
// Rotate encryption key
await offlineInspectionStorage.rotateEncryptionKey();

// Re-encrypt all data
await offlineInspectionStorage.reencryptAllData();
```

---

## 📊 Performance Issues

### Issue: Slow Database Queries

**Symptoms:**
- Query time > 500ms
- Timeout errors
- Poor user experience

**Identify Slow Queries:**
```sql
SELECT 
  query,
  mean_exec_time,
  calls,
  total_exec_time
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;
```

**Add Missing Indexes:**
```sql
-- Common missing indexes
CREATE INDEX CONCURRENTLY idx_inspections_date 
ON safety_inspections(inspection_date DESC);

CREATE INDEX CONCURRENTLY idx_inspections_status 
ON safety_inspections(status, created_at);

CREATE INDEX CONCURRENTLY idx_photos_album_order 
ON trip_photos(album_id, order_index);
```

**Optimize Queries:**
```sql
-- Before: Slow
SELECT * FROM safety_inspections 
WHERE captain_id = 'xxx' 
ORDER BY inspection_date DESC;

-- After: Fast
SELECT id, vessel_id, inspection_date, status 
FROM safety_inspections 
WHERE captain_id = 'xxx' 
ORDER BY inspection_date DESC 
LIMIT 20;
```

---

### Issue: High CPU Usage

**Check System Resources:**
```bash
# On server
top -o %CPU
htop  # If installed

# In Supabase Dashboard
# Settings → Usage → CPU Usage graph
```

**Common Causes:**

1. **Inefficient queries**
```sql
-- Find CPU-intensive queries
SELECT query, calls, total_time, mean_time
FROM pg_stat_statements
ORDER BY total_time DESC
LIMIT 10;
```

2. **Too many connections**
```sql
SELECT count(*), state
FROM pg_stat_activity
GROUP BY state;
-- Active should be < 50
```

3. **Image processing**
```typescript
// Limit concurrent image processing
const semaphore = new Semaphore(5);  // Max 5 at once

await semaphore.acquire();
try {
  await imageOptimizer.optimizeImage(file);
} finally {
  semaphore.release();
}
```

---

### Issue: Memory Leaks

**Symptoms:**
- Memory usage growing over time
- Eventually crashes
- Slow performance

**Check Memory:**
```javascript
// In Node.js
console.log(process.memoryUsage());
// {
//   rss: 123 MB,
//   heapTotal: 89 MB,
//   heapUsed: 76 MB,
//   external: 12 MB
// }
```

**Common Causes:**

1. **Connection pool not releasing**
```typescript
// Wrong - leaks connections
const result = await pool.query('SELECT ...');
// Connection never released!

// Right - always release
const client = await pool.connect();
try {
  const result = await client.query('SELECT ...');
} finally {
  client.release();  // Always release!
}
```

2. **Large cache**
```typescript
// Wrong - unbounded cache
const cache = {};
cache[key] = value;  // Grows forever!

// Right - bounded cache
import LRU from 'lru-cache';
const cache = new LRU({ max: 500 });
cache.set(key, value);  // Auto-evicts old items
```

3. **Event listeners not removed**
```typescript
// Wrong
window.addEventListener('resize', handler);
// Listener never removed!

// Right
useEffect(() => {
  window.addEventListener('resize', handler);
  return () => {
    window.removeEventListener('resize', handler);
  };
}, []);
```

---

## 🔒 Security Issues

### Issue: Unauthorized Access

**Symptoms:**
- Users accessing others' data
- Bypass of permissions

**Check RLS Policies:**
```sql
-- View all policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
ORDER BY schemaname, tablename;
```

**Test RLS:**
```sql
-- Impersonate a user
SET LOCAL role authenticated;
SET LOCAL request.jwt.claim.sub = 'user-id-here';

-- Try to access data
SELECT * FROM safety_inspections WHERE captain_id != 'user-id-here';
-- Should return 0 rows

-- Reset
RESET role;
```

**Fix Common Issues:**

1. **Missing RLS policy**
```sql
-- Enable RLS if not enabled
ALTER TABLE safety_inspections ENABLE ROW LEVEL SECURITY;

-- Add policy
CREATE POLICY "users_own_data"
ON safety_inspections
FOR ALL
TO authenticated
USING (captain_id = auth.uid())
WITH CHECK (captain_id = auth.uid());
```

2. **Too permissive policy**
```sql
-- Bad - allows all
CREATE POLICY "allow_all"
ON safety_inspections
FOR SELECT
USING (true);  -- BAD!

-- Good - restricted
CREATE POLICY "users_own_data"
ON safety_inspections
FOR SELECT
USING (captain_id = auth.uid());  -- GOOD!
```

---

### Issue: Rate Limit Bypass

**Symptoms:**
- Attacker bypassing rate limits
- Unusual traffic patterns

**Check Rate Limit Stats:**
```typescript
// In Redis or memory store
const stats = await rateLimiter.getStats();
console.log({
  totalRequests: stats.total,
  blockedRequests: stats.blocked,
  topIPs: stats.topIPs
});
```

**Strengthen Rate Limiting:**
```typescript
// Add stricter limits
const strictLimiter = createRateLimiter({
  windowMs: 5 * 60 * 1000,  // 5 min (shorter window)
  max: 25,  // Fewer requests
  skipFailedRequests: false,  // Count all requests
  skipSuccessfulRequests: false
});

// Add IP ban after violations
const limiter = createRateLimiter({
  max: 100,
  handler: async (req, res) => {
    await rateLimiter.banIP(req.ip, {
      duration: 3600000,  // 1 hour
      reason: 'Rate limit exceeded'
    });
    res.status(429).json({ error: 'Too many requests' });
  }
});
```

---

## 🐛 Development Issues

### Issue: TypeScript Compilation Errors

**Common Errors:**

1. **Cannot find module**
```bash
Error: Cannot find module '@/lib/connectionPool'
```

**Fix:**
```json
// In tsconfig.json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"],
      "@/lib/*": ["./lib/*"]
    }
  }
}
```

2. **Type errors**
```typescript
// Error: Property 'signature_url' does not exist
interface Inspection {
  signature_url?: string;  // Add property
  signature_metadata?: any;
}
```

---

### Issue: Edge Function Deployment Fails

**Error:**
```
Error: Failed to deploy function
Deploy error: [detailed error]
```

**Common Causes:**

1. **Missing dependencies**
```typescript
// In index.ts, check imports
import { serve } from 'std/server';  // Correct for Deno
```

2. **Environment variables not set**
```bash
# Set secrets
supabase secrets set SUPABASE_URL="..."
supabase secrets set SUPABASE_SERVICE_KEY="..."
```

3. **Syntax errors**
```bash
# Check function locally
deno run --allow-net supabase/functions/catch-of-the-day/index.ts
```

---

## 📱 Client-Side Issues

### Issue: Offline Storage Not Working

**Check Browser Support:**
```javascript
if ('storage' in navigator && 'estimate' in navigator.storage) {
  const {usage, quota} = await navigator.storage.estimate();
  console.log(`Using ${usage} of ${quota} bytes`);
} else {
  console.error('Storage API not supported');
}
```

**Clear Quota Issues:**
```javascript
// Request persistent storage
if ('persist' in navigator.storage) {
  const isPersisted = await navigator.storage.persist();
  console.log(`Persisted: ${isPersisted}`);
}

// Check if storage is full
const estimate = await navigator.storage.estimate();
const percentUsed = (estimate.usage / estimate.quota) * 100;
if (percentUsed > 90) {
  alert('Storage nearly full. Please sync and clear old data.');
}
```

---

## 🔍 Diagnostic Commands

### Quick Health Check
```bash
#!/bin/bash
echo "=== System Health Check ==="

echo "1. Database Connection:"
psql $DATABASE_URL -c "SELECT 1" > /dev/null 2>&1 && echo "✓ OK" || echo "✗ FAILED"

echo "2. Storage Bucket:"
curl -s -o /dev/null -w "%{http_code}" \
  "$SUPABASE_URL/storage/v1/bucket/inspection_signatures" | \
  grep -q "200" && echo "✓ OK" || echo "✗ FAILED"

echo "3. Edge Functions:"
curl -s -o /dev/null -w "%{http_code}" \
  "$SUPABASE_URL/functions/v1/catch-of-the-day" | \
  grep -q "200\|400" && echo "✓ OK" || echo "✗ FAILED"

echo "4. Rate Limiting:"
# Make 101 requests
for i in {1..101}; do curl -s -o /dev/null "$API_URL/health"; done
# Last one should be rate limited

echo "=== Health Check Complete ==="
```

### Performance Metrics
```sql
-- Query performance
SELECT 
  substring(query, 1, 50) as query_start,
  calls,
  mean_exec_time::numeric(10,2) as avg_ms,
  (total_exec_time / 1000)::numeric(10,2) as total_sec
FROM pg_stat_statements
WHERE mean_exec_time > 100
ORDER BY mean_exec_time DESC
LIMIT 20;

-- Connection stats
SELECT 
  datname,
  count(*) as connections,
  count(*) FILTER (WHERE state = 'active') as active,
  count(*) FILTER (WHERE state = 'idle') as idle
FROM pg_stat_activity
GROUP BY datname;

-- Table sizes
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
  pg_total_relation_size(schemaname||'.'||tablename) as size_bytes
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY size_bytes DESC
LIMIT 20;
```

---

## 🆘 Getting Help

### Before Contacting Support

1. **Gather Information:**
```bash
# System info
node --version
npm --version
psql --version

# Error logs
supabase functions logs catch-of-the-day --limit 100 > logs.txt

# Database stats
psql $DATABASE_URL -f diagnostic-queries.sql > db-stats.txt

# Environment (sanitized)
env | grep -v "KEY\|SECRET\|PASSWORD" > env.txt
```

2. **Document the Issue:**
- What were you trying to do?
- What happened instead?
- Error messages (exact text)
- When did it start?
- Any recent changes?

3. **Try Basic Fixes:**
- Restart services
- Clear caches
- Check logs
- Verify environment variables

### Support Channels

- **Documentation:** Check all `.md` files first
- **GitHub Issues:** For bugs and feature requests  
- **Email:** support@gulfcoastcharters.com
- **Slack:** #engineering channel (internal)

---

## 📚 Additional Resources

- **DEPLOYMENT_GUIDE.md** - Step-by-step deployment
- **README.md** - Complete technical docs
- **IMPLEMENTATION_SUMMARY.md** - What was built
- **Supabase Docs** - https://supabase.com/docs
- **PostgreSQL Docs** - https://www.postgresql.org/docs/

---

**Last Updated:** November 2025  
**Version:** 1.0.0  
**Status:** Production Ready
