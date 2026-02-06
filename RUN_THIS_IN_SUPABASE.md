# Run This SQL Query in Supabase

**Go to:** https://supabase.com/dashboard/project/nqkbqtiramecvmmpaxzk/sql

**Paste this query:**

```sql
SELECT 
    t.table_name,
    c.column_name,
    c.data_type,
    c.character_maximum_length,
    CASE 
        WHEN pk.column_name IS NOT NULL THEN 'yes'
        ELSE 'no'
    END AS is_primary_key,
    CASE 
        WHEN c.is_nullable = 'YES' THEN 'yes'
        ELSE 'no'
    END AS is_nullable,
    c.column_default,
    c.udt_name AS postgres_type
FROM 
    information_schema.tables t
    JOIN information_schema.columns c ON t.table_name = c.table_name
    LEFT JOIN (
        SELECT 
            ku.table_name,
            ku.column_name
        FROM 
            information_schema.table_constraints tc
            JOIN information_schema.key_column_usage ku 
                ON tc.constraint_name = ku.constraint_name
        WHERE 
            tc.constraint_type = 'PRIMARY KEY'
            AND tc.table_schema = 'public'
    ) pk ON c.table_name = pk.table_name AND c.column_name = pk.column_name
WHERE 
    t.table_schema = 'public'
    AND t.table_type = 'BASE TABLE'
ORDER BY 
    t.table_name,
    c.ordinal_position;
```

**Click "Run"**

**Copy all results and paste them here!**

---

## What This Will Give You

A complete list of:
- All table names
- All column names for each table
- Data types
- Which columns are primary keys
- Which columns are nullable
- Default values

This will help Zapier AI configure the database updates correctly!
