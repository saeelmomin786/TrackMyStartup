-- =====================================================
-- ANALYZE UNUSED TABLES
-- =====================================================
-- Identifies tables that appear to be unused based on activity statistics

-- =====================================================
-- 1. TABLES WITH NO ACTIVITY (Never used)
-- =====================================================
SELECT 
    '=== TABLES WITH ZERO ACTIVITY ===' as section,
    schemaname,
    relname as tablename,
    n_live_tup as row_count,
    n_tup_ins as total_inserts,
    n_tup_upd as total_updates,
    n_tup_del as total_deletes,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||relname)) as total_size,
    last_vacuum,
    last_autovacuum,
    CASE 
        WHEN n_tup_ins = 0 AND n_tup_upd = 0 AND n_tup_del = 0 AND n_live_tup = 0
        THEN '✅ Empty and unused - Safe candidate for removal'
        WHEN n_tup_ins = 0 AND n_tup_upd = 0 AND n_tup_del = 0 AND n_live_tup > 0
        THEN '⚠️ Has data but no activity - Review before removing'
        ELSE 'ℹ️ Some activity'
    END as status
FROM pg_stat_user_tables
WHERE schemaname = 'public'
  AND n_tup_ins = 0 
  AND n_tup_upd = 0 
  AND n_tup_del = 0
ORDER BY pg_total_relation_size(schemaname||'.'||relname) DESC;

-- =====================================================
-- 2. TABLES WITH VERY LOW ACTIVITY (Rarely used)
-- =====================================================
SELECT 
    '=== TABLES WITH VERY LOW ACTIVITY ===' as section,
    schemaname,
    relname as tablename,
    n_live_tup as row_count,
    n_tup_ins as total_inserts,
    n_tup_upd as total_updates,
    n_tup_del as total_deletes,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||relname)) as total_size,
    CASE 
        WHEN (n_tup_ins + n_tup_upd + n_tup_del) < 10 AND n_live_tup = 0
        THEN '⚠️ Almost unused - Review for removal'
        ELSE 'ℹ️ Low activity - Review'
    END as status
FROM pg_stat_user_tables
WHERE schemaname = 'public'
  AND (n_tup_ins + n_tup_upd + n_tup_del) < 10
  AND n_live_tup = 0  -- Empty tables only
ORDER BY (n_tup_ins + n_tup_upd + n_tup_del) ASC, pg_total_relation_size(schemaname||'.'||relname) DESC;

-- =====================================================
-- 3. CHECK FOR FOREIGN KEY DEPENDENCIES
-- =====================================================
-- Tables that are referenced by other tables (more risky to delete)
SELECT 
    '=== TABLES REFERENCED BY OTHER TABLES ===' as section,
    tc.table_name as referencing_table,
    ccu.table_name as referenced_table,
    tc.constraint_name as fk_name,
    '⚠️ This table is referenced - check dependencies before deleting' as warning
FROM information_schema.table_constraints tc
JOIN information_schema.constraint_column_usage ccu 
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
  AND ccu.table_schema = 'public'
ORDER BY ccu.table_name, tc.table_name;

-- =====================================================
-- 4. ALL TABLES WITH THEIR ACTIVITY SUMMARY
-- =====================================================
SELECT 
    '=== ALL TABLES ACTIVITY SUMMARY ===' as section,
    schemaname,
    relname as tablename,
    n_live_tup as row_count,
    (n_tup_ins + n_tup_upd + n_tup_del) as total_operations,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||relname)) as total_size,
    CASE 
        WHEN (n_tup_ins + n_tup_upd + n_tup_del) = 0 AND n_live_tup = 0
        THEN '✅ Empty and unused'
        WHEN (n_tup_ins + n_tup_upd + n_tup_del) = 0 AND n_live_tup > 0
        THEN '⚠️ Has data but no activity'
        WHEN (n_tup_ins + n_tup_upd + n_tup_del) < 10
        THEN 'ℹ️ Very low activity'
        ELSE '✅ Active'
    END as usage_status
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY (n_tup_ins + n_tup_upd + n_tup_del) ASC, pg_total_relation_size(schemaname||'.'||relname) DESC;











