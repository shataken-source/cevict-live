# 🔒 Row Level Security (RLS) Setup Guide

## Overview
This guide helps you enable and configure Row Level Security for all database tables.

---

## Step 1: Enable RLS on All Tables

Run this SQL in **Supabase SQL Editor**:

```sql
-- Copy from: supabase/migrations/20240122_enable_rls.sql
```

Or manually enable RLS in Supabase Dashboard:
1. Go to **Database** > **Tables**
2. Click on each table
3. Click **Enable RLS** button

---

## Step 2: Apply RLS Policies

Run this SQL in **Supabase SQL Editor**:

```sql
-- Copy from: supabase/migrations/20240122_rls_policies.sql
```

---

## Step 3: Verify RLS is Working

Test with these queries:

```sql
-- Should return only your data
SELECT * FROM profiles WHERE id = auth.uid();

-- Should return only your bookings
SELECT * FROM bookings WHERE user_id = auth.uid();

-- Should return only approved captains
SELECT * FROM captains WHERE status = 'approved';
```

---

## Common RLS Patterns

### Pattern 1: User Owns Record
```sql
CREATE POLICY "Users manage own data"
  ON table_name FOR ALL
  USING (auth.uid() = user_id);
```

### Pattern 2: Public Read, Owner Write
```sql
CREATE POLICY "Public read"
  ON table_name FOR SELECT
  USING (true);

CREATE POLICY "Owner write"
  ON table_name FOR INSERT
  WITH CHECK (auth.uid() = user_id);
```

### Pattern 3: Admin Access
```sql
CREATE POLICY "Admin full access"
  ON table_name FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
```

---

## Troubleshooting

### Issue: "Permission Denied"
**Solution**: Check if RLS is enabled and user has correct policy

### Issue: "No rows returned"
**Solution**: Verify auth.uid() matches user_id in table

### Issue: "Policy conflict"
**Solution**: Drop existing policies first:
```sql
DROP POLICY IF EXISTS "policy_name" ON table_name;
```

---

## Security Best Practices

1. ✅ Always enable RLS on tables with user data
2. ✅ Use auth.uid() to verify ownership
3. ✅ Separate read and write policies
4. ✅ Test policies with different user roles
5. ✅ Use service role key only in edge functions
6. ❌ Never disable RLS on production tables
7. ❌ Never use SELECT * in policies without filters

---

## Next Steps

After enabling RLS:
1. Test all user flows (signup, login, booking)
2. Verify captains can only see their data
3. Confirm admins have full access
4. Check edge functions use service role key
