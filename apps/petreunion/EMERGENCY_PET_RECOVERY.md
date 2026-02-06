# Emergency: Pets Missing - Recovery Steps

## Immediate Checks

### 1. Check Total Pets (No Filters)
```sql
-- Check ALL pets (including those without photos)
SELECT COUNT(*) as total_pets FROM lost_pets;
```

### 2. Check Pets with Photos
```sql
SELECT COUNT(*) as pets_with_photos 
FROM lost_pets 
WHERE photo_url IS NOT NULL 
  AND photo_url != '';
```

### 3. Check Pets Without Photos
```sql
SELECT COUNT(*) as pets_without_photos 
FROM lost_pets 
WHERE photo_url IS NULL 
  OR photo_url = '';
```

### 4. See All Pets (Last 10)
```sql
SELECT 
  id,
  pet_name,
  pet_type,
  breed,
  photo_url,
  status,
  created_at
FROM lost_pets 
ORDER BY created_at DESC
LIMIT 10;
```

## Possible Causes

### 1. Schema Cache Issue
- Tables exist but API can't see them
- **Fix:** Refresh Supabase schema cache

### 2. RLS (Row Level Security) Blocking
- Policies might be blocking access
- **Check:**
```sql
-- Check RLS status
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename = 'lost_pets';
```

### 3. Data Actually Deleted
- Check if there's a backup
- Check Supabase backups/point-in-time recovery

### 4. Wrong Database/Project
- Make sure you're querying the correct Supabase project
- Check your connection string

## Recovery Options

### Option 1: Check Supabase Backups
1. Go to **Supabase Dashboard**
2. **Database** → **Backups**
3. Check if there's a recent backup
4. Restore if available

### Option 2: Point-in-Time Recovery
If you have PITR enabled:
1. **Database** → **Backups**
2. Select a time before data was lost
3. Restore to that point

### Option 3: Check if Data is in Another Table
```sql
-- Check all tables
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;

-- Check if there's a backup table
SELECT COUNT(*) FROM lost_pets_backup; -- if exists
```

## Immediate Actions

1. **Don't panic** - Check the queries above first
2. **Verify connection** - Make sure you're connected to the right database
3. **Check RLS policies** - They might be blocking access
4. **Check backups** - Supabase might have automatic backups

## If Data is Really Gone

1. Check Supabase Dashboard → Database → Backups
2. Contact Supabase support if you have a paid plan
3. Check your application logs for any DELETE operations
4. Review recent schema changes that might have affected data
