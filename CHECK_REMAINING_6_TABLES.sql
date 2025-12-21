-- =====================================================
-- CHECK REMAINING 6 EMPTY TABLES
-- =====================================================
-- These are the empty tables that were NOT deleted (have dependencies)

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
    '=== REMAINING 6 EMPTY TABLES (Have Dependencies) ===' as section,
    et.tablename,
    pg_size_pretty(pg_total_relation_size('public.'||et.tablename)) as table_size,
    CASE 
        WHEN rt.table_name IS NOT NULL THEN '⚠️ Has foreign key dependencies'
        ELSE '✅ No dependencies (should have been deleted)'
    END as reason
FROM empty_tables et
LEFT JOIN referenced_tables rt ON rt.table_name = et.tablename
WHERE rt.table_name IS NOT NULL  -- Has dependencies
ORDER BY et.tablename;

-- =====================================================
-- SHOW WHAT REFERENCES THESE TABLES
-- =====================================================
SELECT 
    '=== DEPENDENCY DETAILS ===' as section,
    ccu.table_name as empty_table,
    tc.table_name as referencing_table,
    kcu.column_name as fk_column,
    tc.constraint_name as fk_name,
    '⚠️ This table references the empty table via foreign key' as details
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





