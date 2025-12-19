-- =====================================================
-- PERFORMANCE OPTIMIZATION CHECK
-- =====================================================
-- Identifies performance bottlenecks and optimization opportunities

-- =====================================================
-- 1. SLOW QUERIES (Tables with high sequential scans)
-- =====================================================
SELECT 
    '=== TABLES WITH HIGH SEQUENTIAL SCANS ===' as section,
    schemaname,
    relname as tablename,
    seq_scan as sequential_scans,
    idx_scan as index_scans,
    CASE 
        WHEN seq_scan > 0 THEN 
            ROUND(100.0 * seq_scan / (seq_scan + idx_scan + 1), 2)::text || '%'
        ELSE '0%'
    END as seq_scan_percentage,
    CASE 
        WHEN seq_scan > idx_scan * 10 AND seq_scan > 1000 
        THEN '⚠️ High sequential scans - Add indexes!'
        WHEN seq_scan > 100 
        THEN 'ℹ️ Some sequential scans - Review indexes'
        ELSE '✅ Good'
    END as status
FROM pg_stat_user_tables
WHERE schemaname = 'public'
  AND seq_scan > 100
ORDER BY seq_scan DESC
LIMIT 20;

-- =====================================================
-- 2. TABLES NEEDING VACUUM
-- =====================================================
SELECT 
    '=== TABLES NEEDING VACUUM ===' as section,
    schemaname,
    relname as tablename,
    n_dead_tup as dead_tuples,
    n_live_tup as live_tuples,
    CASE 
        WHEN n_live_tup > 0 THEN 
            ROUND(100.0 * n_dead_tup / (n_live_tup + n_dead_tup), 2)::text || '%'
        ELSE '0%'
    END as dead_tuple_percentage,
    last_vacuum,
    last_autovacuum,
    CASE 
        WHEN n_dead_tup > n_live_tup * 0.1 AND n_dead_tup > 1000
        THEN '⚠️ High dead tuples - Run VACUUM!'
        WHEN n_dead_tup > 1000
        THEN 'ℹ️ Some dead tuples - Consider VACUUM'
        ELSE '✅ Good'
    END as status
FROM pg_stat_user_tables
WHERE schemaname = 'public'
  AND n_dead_tup > 1000
ORDER BY n_dead_tup DESC
LIMIT 20;

-- =====================================================
-- 3. INDEXES NOT BEING USED (Memory/space waste)
-- =====================================================
SELECT 
    '=== UNUSED INDEXES (Waste space/memory) ===' as section,
    schemaname,
    relname as tablename,
    indexrelname as indexname,
    pg_size_pretty(pg_relation_size(indexrelid)) as index_size,
    idx_scan as times_used,
    pg_size_pretty(pg_relation_size(indexrelid::regclass)) as size,
    '❌ Remove to free space and improve write performance' as recommendation
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
  AND idx_scan = 0
  AND indexrelname NOT LIKE '%pkey%'  -- Keep primary keys
  AND indexrelname NOT LIKE '%_key'   -- Keep unique constraints
ORDER BY pg_relation_size(indexrelid) DESC
LIMIT 30;

-- =====================================================
-- 4. LARGE INDEXES (Check if they're actually needed)
-- =====================================================
SELECT 
    '=== LARGE INDEXES ===' as section,
    schemaname,
    relname as tablename,
    indexrelname as indexname,
    pg_size_pretty(pg_relation_size(indexrelid)) as index_size,
    idx_scan as times_used,
    CASE 
        WHEN idx_scan < 10 AND pg_relation_size(indexrelid) > 10485760  -- > 10MB and rarely used
        THEN '⚠️ Large and rarely used - Consider removing'
        WHEN pg_relation_size(indexrelid) > 104857600  -- > 100MB
        THEN 'ℹ️ Very large - Review if needed'
        ELSE '✅ Reasonable'
    END as status
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
  AND pg_relation_size(indexrelid) > 10485760  -- > 10MB
ORDER BY pg_relation_size(indexrelid) DESC
LIMIT 20;

-- =====================================================
-- 5. TABLES WITHOUT STATISTICS (Need ANALYZE)
-- =====================================================
SELECT 
    '=== TABLES NEEDING ANALYZE ===' as section,
    schemaname,
    relname as tablename,
    last_analyze,
    last_autoanalyze,
    CASE 
        WHEN last_analyze IS NULL AND last_autoanalyze IS NULL
        THEN '⚠️ Never analyzed - Run ANALYZE!'
        WHEN last_analyze < NOW() - INTERVAL '7 days' AND last_autoanalyze < NOW() - INTERVAL '7 days'
        THEN '⚠️ Stale statistics - Run ANALYZE!'
        ELSE '✅ Recent statistics'
    END as status
FROM pg_stat_user_tables
WHERE schemaname = 'public'
  AND (last_analyze IS NULL OR last_analyze < NOW() - INTERVAL '7 days')
  AND (last_autoanalyze IS NULL OR last_autoanalyze < NOW() - INTERVAL '7 days')
ORDER BY relname;

-- =====================================================
-- 6. TOTAL SPACE USAGE BREAKDOWN
-- =====================================================
SELECT 
    '=== SPACE USAGE BREAKDOWN ===' as section,
    'Total Database Size' as metric,
    pg_size_pretty(pg_database_size(current_database())) as size;

SELECT 
    'Public Schema Tables' as metric,
    pg_size_pretty(SUM(pg_total_relation_size(schemaname||'.'||tablename))) as size
FROM pg_tables 
WHERE schemaname = 'public';

SELECT 
    'Public Schema Indexes' as metric,
    pg_size_pretty(SUM(pg_relation_size(indexrelid))) as size
FROM pg_stat_user_indexes
WHERE schemaname = 'public';

-- =====================================================
-- 7. RECOMMENDATIONS SUMMARY
-- =====================================================
SELECT 
    '=== PERFORMANCE RECOMMENDATIONS ===' as section,
    (SELECT COUNT(*) FROM pg_stat_user_indexes WHERE schemaname = 'public' AND idx_scan = 0 
     AND indexname NOT LIKE '%pkey%' AND indexname NOT LIKE '%_key') as unused_indexes_to_remove,
    (SELECT COUNT(*) FROM pg_stat_user_tables WHERE schemaname = 'public' 
     AND n_dead_tup > n_live_tup * 0.1 AND n_dead_tup > 1000) as tables_needing_vacuum,
    (SELECT COUNT(*) FROM pg_stat_user_tables WHERE schemaname = 'public' 
     AND seq_scan > idx_scan * 10 AND seq_scan > 1000) as tables_needing_indexes,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users')
        THEN '⚠️ Delete old users table'
        ELSE '✅ No old users table'
    END as cleanup_opportunity;

