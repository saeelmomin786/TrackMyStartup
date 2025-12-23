-- =====================================================
-- IDENTIFY SAFE TABLES TO DELETE
-- =====================================================
-- Shows empty tables that are NOT referenced by foreign keys
-- These are safe to delete immediately

WITH empty_tables AS (
    SELECT relname as tablename
    FROM pg_stat_user_tables
    WHERE schemaname = 'public'
      AND n_live_tup = 0
      AND n_tup_ins = 0
      AND n_tup_upd = 0
      AND n_tup_del = 0
),
referenced_tables AS (
    SELECT DISTINCT ccu.table_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.constraint_column_usage ccu 
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_schema = 'public'
      AND ccu.table_schema = 'public'
)
SELECT 
    '=== SAFE TO DELETE (No Dependencies) ===' as section,
    et.tablename,
    pg_size_pretty(pg_total_relation_size('public.'||et.tablename)) as table_size,
    '✅ Safe to delete - no foreign key references' as status,
    'DROP TABLE IF EXISTS public.' || quote_ident(et.tablename) || ' CASCADE;' as drop_statement
FROM empty_tables et
LEFT JOIN referenced_tables rt ON rt.table_name = et.tablename
WHERE rt.table_name IS NULL  -- Not referenced
ORDER BY et.tablename;

-- =====================================================
-- TABLES WITH DEPENDENCIES (Cannot delete yet)
-- =====================================================
WITH empty_tables AS (
    SELECT relname as tablename
    FROM pg_stat_user_tables
    WHERE schemaname = 'public'
      AND n_live_tup = 0
      AND n_tup_ins = 0
      AND n_tup_upd = 0
      AND n_tup_del = 0
),
referenced_tables AS (
    SELECT DISTINCT ccu.table_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.constraint_column_usage ccu 
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_schema = 'public'
      AND ccu.table_schema = 'public'
)
SELECT 
    '=== CANNOT DELETE YET (Has Dependencies) ===' as section,
    et.tablename,
    pg_size_pretty(pg_total_relation_size('public.'||et.tablename)) as table_size,
    '⚠️ Referenced by foreign keys - delete referencing tables first' as status
FROM empty_tables et
JOIN referenced_tables rt ON rt.table_name = et.tablename
ORDER BY et.tablename;

-- =====================================================
-- DEPENDENCY CHAINS (For tables that can't be deleted yet)
-- =====================================================
-- Shows the full dependency chain so you can delete in correct order
SELECT 
    '=== DEPENDENCY CHAINS ===' as section,
    ccu.table_name as empty_table,
    tc.table_name as referencing_table,
    kcu.column_name as fk_column,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_stat_user_tables 
            WHERE relname = tc.table_name 
              AND n_live_tup = 0 
              AND n_tup_ins = 0
        ) THEN '✅ Referencing table is also empty - can delete together'
        ELSE '⚠️ Referencing table has data - cannot delete empty table'
    END as dependency_status
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage ccu 
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
  AND ccu.table_schema = 'public'
  AND ccu.table_name IN (
      SELECT relname
      FROM pg_stat_user_tables
      WHERE schemaname = 'public'
        AND n_live_tup = 0
        AND n_tup_ins = 0
        AND n_tup_upd = 0
        AND n_tup_del = 0
  )
ORDER BY ccu.table_name, tc.table_name;











