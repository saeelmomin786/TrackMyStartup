-- =====================================================
-- FIND MORE UNUSED TABLES (Low Activity)
-- =====================================================
-- Finds tables with very low activity that might be unused

-- =====================================================
-- 1. Tables with very low activity (likely unused)
-- =====================================================
SELECT 
    '=== TABLES WITH VERY LOW ACTIVITY ===' as section,
    schemaname,
    relname as tablename,
    n_live_tup as row_count,
    (n_tup_ins + n_tup_upd + n_tup_del) as total_operations,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||relname)) as table_size,
    CASE 
        WHEN (n_tup_ins + n_tup_upd + n_tup_del) = 0 AND n_live_tup = 0 THEN '✅ Empty and unused'
        WHEN (n_tup_ins + n_tup_upd + n_tup_del) < 5 AND n_live_tup < 5 THEN '⚠️ Very low activity - Review'
        WHEN (n_tup_ins + n_tup_upd + n_tup_del) < 10 THEN 'ℹ️ Low activity - Review'
        ELSE '✅ Active'
    END as usage_status
FROM pg_stat_user_tables
WHERE schemaname = 'public'
  AND (n_tup_ins + n_tup_upd + n_tup_del) < 10  -- Less than 10 total operations
ORDER BY (n_tup_ins + n_tup_upd + n_tup_del) ASC, n_live_tup ASC, pg_total_relation_size(schemaname||'.'||relname) DESC;

-- =====================================================
-- 2. Tables with data but no recent activity
-- =====================================================
SELECT 
    '=== TABLES WITH DATA BUT NO ACTIVITY ===' as section,
    schemaname,
    relname as tablename,
    n_live_tup as row_count,
    (n_tup_ins + n_tup_upd + n_tup_del) as total_operations,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||relname)) as table_size,
    last_vacuum,
    last_autovacuum,
    CASE 
        WHEN (n_tup_ins + n_tup_upd + n_tup_del) = 0 AND n_live_tup > 0 
        THEN '⚠️ Has data but no activity - Could be old/unused data'
        ELSE 'ℹ️ Some activity'
    END as status
FROM pg_stat_user_tables
WHERE schemaname = 'public'
  AND n_live_tup > 0  -- Has data
  AND (n_tup_ins + n_tup_upd + n_tup_del) = 0  -- But no activity
ORDER BY n_live_tup DESC, pg_total_relation_size(schemaname||'.'||relname) DESC;

-- =====================================================
-- 3. Backup/old/test tables (by naming pattern)
-- =====================================================
SELECT 
    '=== POTENTIALLY UNUSED TABLES (By Name Pattern) ===' as section,
    tablename,
    pg_size_pretty(pg_total_relation_size('public.'||tablename)) as table_size,
    (SELECT n_live_tup FROM pg_stat_user_tables WHERE relname = tablename) as row_count,
    CASE 
        WHEN tablename ILIKE '%backup%' OR tablename ILIKE '%_backup' THEN '⚠️ Backup table - Review'
        WHEN tablename ILIKE '%old%' OR tablename ILIKE '%_old' THEN '⚠️ Old table - Review'
        WHEN tablename ILIKE '%test%' OR tablename ILIKE '%_test' THEN '⚠️ Test table - Review'
        WHEN tablename ILIKE '%temp%' OR tablename ILIKE '%_temp' THEN '⚠️ Temp table - Review'
        WHEN tablename ILIKE '%archive%' THEN '⚠️ Archive table - Review'
        ELSE 'ℹ️ Review manually'
    END as table_type
FROM pg_tables
WHERE schemaname = 'public'
  AND (
      tablename ILIKE '%backup%'
      OR tablename ILIKE '%_backup'
      OR tablename ILIKE '%old%'
      OR tablename ILIKE '%_old'
      OR tablename ILIKE '%test%'
      OR tablename ILIKE '%_test'
      OR tablename ILIKE '%temp%'
      OR tablename ILIKE '%_temp'
      OR tablename ILIKE '%archive%'
  )
ORDER BY tablename;















