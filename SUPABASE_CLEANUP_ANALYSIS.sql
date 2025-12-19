-- =====================================================
-- SUPABASE CLEANUP & PERFORMANCE ANALYSIS
-- =====================================================
-- This script identifies unused objects and performance issues

-- =====================================================
-- 1. CHECK OLD users TABLE (Ready to delete)
-- =====================================================
SELECT 
    '=== OLD users TABLE STATUS ===' as section,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users')
        THEN '⚠️ users TABLE STILL EXISTS - Ready to delete (already migrated)'
        ELSE '✅ users TABLE ALREADY DELETED'
    END as status,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users')
        THEN (SELECT COUNT(*)::text FROM public.users)
        ELSE 'N/A'
    END as row_count;

-- =====================================================
-- 2. UNUSED INDEXES (Take up space, slow writes)
-- =====================================================
SELECT 
    '=== POTENTIALLY UNUSED INDEXES ===' as section,
    schemaname,
    relname as tablename,
    indexrelname as indexname,
    pg_size_pretty(pg_relation_size(indexrelid)) as index_size,
    idx_scan as times_used,
    CASE 
        WHEN idx_scan = 0 THEN '❌ NEVER USED - Candidate for removal'
        WHEN idx_scan < 10 THEN '⚠️ RARELY USED - Consider removing'
        ELSE '✅ Used regularly'
    END as usage_status
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
  AND idx_scan = 0  -- Never used
ORDER BY pg_relation_size(indexrelid) DESC
LIMIT 20;

-- =====================================================
-- 3. LARGE TABLES (Check for cleanup opportunities)
-- =====================================================
SELECT 
    '=== LARGE TABLES ===' as section,
    t.schemaname,
    t.tablename,
    pg_size_pretty(pg_total_relation_size(t.schemaname||'.'||t.tablename)) as total_size,
    pg_size_pretty(pg_relation_size(t.schemaname||'.'||t.tablename)) as table_size,
    pg_size_pretty(pg_total_relation_size(t.schemaname||'.'||t.tablename) - pg_relation_size(t.schemaname||'.'||t.tablename)) as indexes_size,
    COALESCE(s.n_live_tup, 0) as row_count
FROM pg_tables t
LEFT JOIN pg_stat_user_tables s ON s.relname = t.tablename AND s.schemaname = t.schemaname
WHERE t.schemaname = 'public'
ORDER BY pg_total_relation_size(t.schemaname||'.'||t.tablename) DESC
LIMIT 20;

-- =====================================================
-- 4. TABLES WITH MANY INDEXES (May slow down writes)
-- =====================================================
SELECT 
    '=== TABLES WITH MANY INDEXES ===' as section,
    idx.schemaname,
    idx.relname as tablename,
    COUNT(*) as index_count,
    pg_size_pretty(SUM(pg_relation_size(idx.indexrelid))) as total_index_size,
    CASE 
        WHEN COUNT(*) > 10 THEN '⚠️ TOO MANY INDEXES - Consider consolidating'
        WHEN COUNT(*) > 5 THEN 'ℹ️ Many indexes'
        ELSE '✅ Reasonable'
    END as status
FROM pg_stat_user_indexes idx
WHERE idx.schemaname = 'public'
GROUP BY idx.schemaname, idx.relname
HAVING COUNT(*) > 5
ORDER BY COUNT(*) DESC;

-- =====================================================
-- 5. UNUSED FUNCTIONS (Check last execution time)
-- =====================================================
-- Note: PostgreSQL doesn't track function execution stats by default
-- This shows functions that might be unused based on naming/patterns
SELECT 
    '=== POTENTIALLY UNUSED FUNCTIONS ===' as section,
    p.proname as function_name,
    pg_size_pretty(pg_relation_size(p.oid)) as function_size,
    CASE 
        WHEN p.proname LIKE '%test%' OR p.proname LIKE '%temp%' OR p.proname LIKE '%old%'
        THEN '⚠️ Test/temp function - Consider removing'
        ELSE 'ℹ️ Review manually'
    END as status
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND (p.proname ILIKE '%test%' OR p.proname ILIKE '%temp%' OR p.proname ILIKE '%old%')
ORDER BY p.proname;

-- =====================================================
-- 6. UNUSED VIEWS (Check if views are actually used)
-- =====================================================
SELECT 
    '=== ALL VIEWS ===' as section,
    schemaname,
    viewname,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||viewname)) as view_size,
    CASE 
        WHEN viewname ILIKE '%test%' OR viewname ILIKE '%temp%' OR viewname ILIKE '%old%'
        THEN '⚠️ Test/temp view - Consider removing'
        ELSE 'ℹ️ Review manually'
    END as status
FROM pg_views
WHERE schemaname = 'public'
ORDER BY viewname;

-- =====================================================
-- 7. TABLES WITH LOW ACTIVITY (Candidates for archiving)
-- =====================================================
SELECT 
    '=== TABLES WITH LOW ACTIVITY ===' as section,
    schemaname,
    relname as tablename,
    n_live_tup as row_count,
    n_tup_ins as total_inserts,
    n_tup_upd as total_updates,
    n_tup_del as total_deletes,
    last_vacuum,
    last_autovacuum,
    CASE 
        WHEN n_tup_ins = 0 AND n_tup_upd = 0 AND n_tup_del = 0 AND n_live_tup > 1000
        THEN '⚠️ Inactive table with data - Consider archiving'
        ELSE 'ℹ️ Active or small'
    END as status
FROM pg_stat_user_tables
WHERE schemaname = 'public'
  AND (n_tup_ins = 0 AND n_tup_upd = 0 AND n_tup_del = 0)
  AND n_live_tup > 1000
ORDER BY n_live_tup DESC;

-- =====================================================
-- 8. MISSING INDEXES ON FOREIGN KEY COLUMNS (Simplified check)
-- =====================================================
-- Note: We converted FKs to indexes, but let's verify all FK columns are indexed
-- This is a simplified check - may have false positives
SELECT 
    '=== FK COLUMNS CHECK (Review manually) ===' as section,
    tc.table_name,
    kcu.column_name,
    'ℹ️ Review if index exists for this FK column' as status
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
  AND kcu.table_schema = 'public'
LIMIT 50;  -- Limit results for performance

-- =====================================================
-- 9. DATABASE SIZE SUMMARY
-- =====================================================
SELECT 
    '=== DATABASE SIZE SUMMARY ===' as section,
    pg_size_pretty(pg_database_size(current_database())) as total_database_size,
    (SELECT pg_size_pretty(SUM(pg_total_relation_size(schemaname||'.'||tablename)))
     FROM pg_tables WHERE schemaname = 'public') as total_public_schema_size;

-- =====================================================
-- 10. SUMMARY OF CLEANUP OPPORTUNITIES
-- =====================================================
SELECT 
    '=== CLEANUP OPPORTUNITIES SUMMARY ===' as section,
    (SELECT COUNT(*) FROM pg_stat_user_indexes WHERE schemaname = 'public' AND idx_scan = 0) as unused_indexes,
    (SELECT COUNT(*) FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid 
     WHERE n.nspname = 'public' AND (p.proname ILIKE '%test%' OR p.proname ILIKE '%temp%' OR p.proname ILIKE '%old%')) as test_functions,
    (SELECT COUNT(*) FROM pg_views WHERE schemaname = 'public' 
     AND (viewname ILIKE '%test%' OR viewname ILIKE '%temp%' OR viewname ILIKE '%old%')) as test_views,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users')
        THEN '⚠️ users table exists (ready to delete)'
        ELSE '✅ users table already deleted'
    END as old_users_table_status;

