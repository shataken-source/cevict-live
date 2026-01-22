# Schema Fix - IMMUTABLE Function Error

## 🐛 Error

```
ERROR: 42P17: functions in index predicate must be marked IMMUTABLE
```

## ✅ Root Cause

Line 227 in `schema.sql` has:
```sql
CREATE INDEX idx_trending_topics_expires_at ON trending_topics(expires_at) WHERE expires_at > NOW();
```

**Problem:** `NOW()` is not IMMUTABLE - it returns different values each time it's called. PostgreSQL doesn't allow non-immutable functions in index predicates.

## 🔧 Fix Applied

I've fixed `schema.sql` by removing the `WHERE expires_at > NOW()` predicate:

**Before:**
```sql
CREATE INDEX idx_trending_topics_expires_at ON trending_topics(expires_at) WHERE expires_at > NOW();
```

**After:**
```sql
CREATE INDEX idx_trending_topics_expires_at ON trending_topics(expires_at);
```

## 🚀 How to Apply

### Option 1: If You Haven't Run schema.sql Yet

1. The fix is already in `schema.sql` (line 227)
2. Just run the entire `schema.sql` file in Supabase SQL Editor
3. It should work now!

### Option 2: If You Already Ran schema.sql and Got the Error

1. The index creation failed, so the table exists but the index doesn't
2. Run this single line in Supabase SQL Editor:
   ```sql
   CREATE INDEX idx_trending_topics_expires_at ON trending_topics(expires_at);
   ```
3. Then continue with the rest of setup (RLS policies, schema cache refresh)

### Option 3: Use the Fixed File

1. I created `schema-fixed.sql` with just the index fix
2. Run it in Supabase SQL Editor if you need to fix the index only

## 📋 Complete Setup Steps (After Fix)

1. **Run schema.sql** (now fixed) in Supabase SQL Editor
2. **Run rls-policies.sql** in Supabase SQL Editor
3. **Refresh schema cache:**
   - Supabase Dashboard → Settings → API → "Reload schema cache"
   - Wait 60 seconds
4. **Verify:**
   ```sql
   SELECT COUNT(*) FROM headlines;
   SELECT COUNT(*) FROM trending_topics;
   ```
5. **Test scraper** - should work now!

## 💡 Why This Still Works

The index on `expires_at` will still help with queries. You just filter in your queries instead of in the index:

**Query example:**
```sql
SELECT * FROM trending_topics 
WHERE expires_at > NOW()  -- Filter in query, not index
ORDER BY fetched_at DESC;
```

The index on `expires_at` will still speed up this query.

---

**Status:** ✅ Fixed in schema.sql
**Next:** Run schema.sql again in Supabase
