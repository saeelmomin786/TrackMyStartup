-- =====================================================
-- LIST 33 SAFE TABLES TO DELETE
-- =====================================================
-- Shows all empty tables that have NO foreign key dependencies
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
    ROW_NUMBER() OVER (ORDER BY et.tablename) as table_number,
    et.tablename,
    pg_size_pretty(pg_total_relation_size('public.'||et.tablename)) as table_size,
    '✅ Safe to delete - no foreign key references' as status
FROM empty_tables et
LEFT JOIN referenced_tables rt ON rt.table_name = et.tablename
WHERE rt.table_name IS NULL  -- Not referenced (safe to delete)
ORDER BY et.tablename;

-- =====================================================
-- SUMMARY COUNT
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
    '=== SUMMARY ===' as section,
    COUNT(*) as safe_tables_count,
    pg_size_pretty(SUM(pg_total_relation_size('public.'||et.tablename))) as total_size_to_free,
    '✅ These tables are safe to delete' as status
FROM empty_tables et
LEFT JOIN referenced_tables rt ON rt.table_name = et.tablename
WHERE rt.table_name IS NULL;  -- Not referenced











