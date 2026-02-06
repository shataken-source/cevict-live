-- =============================================
-- SUPABASE SCHEMA QUERY FOR ZAPIER
-- =============================================
-- Run this in Supabase SQL Editor to get complete schema
-- Copy results and paste back to complete Zapier setup

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
