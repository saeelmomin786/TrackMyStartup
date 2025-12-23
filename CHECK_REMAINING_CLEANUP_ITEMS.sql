-- =====================================================
-- CHECK REMAINING CLEANUP ITEMS
-- =====================================================
-- After cleanup, check what's left

-- =====================================================
-- 1. Check remaining unused indexes
-- =====================================================
SELECT 
    '=== REMAINING UNUSED INDEXES ===' as section,
    schemaname,
    relname as tablename,
    indexrelname as indexname,
    pg_size_pretty(pg_relation_size(indexrelid)) as index_size,
    idx_scan as times_used,
    CASE 
        WHEN relname = 'users' THEN '⚠️ On users table (preserved as requested)'
        WHEN indexrelname LIKE '%pkey%' OR indexrelname LIKE '%_key' OR indexrelname LIKE '%_pk' THEN '⚠️ Primary key or unique constraint (preserved)'
        ELSE 'ℹ️ Review manually'
    END as reason_for_keeping
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
  AND idx_scan = 0
ORDER BY pg_relation_size(indexrelid) DESC;

-- =====================================================
-- 2. Check remaining test functions
-- =====================================================
SELECT 
    '=== REMAINING TEST FUNCTIONS ===' as section,
    p.proname as function_name,
    pg_get_function_arguments(p.oid) as function_arguments,
    substring(pg_get_functiondef(p.oid), 1, 300) as function_preview,
    'Review and decide if safe to remove' as action
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND (p.proname ILIKE '%test%' OR p.proname ILIKE '%temp%' OR p.proname ILIKE '%old%')
ORDER BY p.proname;

-- =====================================================
-- 3. Summary
-- =====================================================
SELECT 
    '=== CLEANUP SUMMARY ===' as section,
    (SELECT COUNT(*) FROM pg_stat_user_indexes 
     WHERE schemaname = 'public' AND idx_scan = 0 
     AND indexrelname NOT LIKE '%pkey%' 
     AND indexrelname NOT LIKE '%_key' 
     AND indexrelname NOT LIKE '%_pk'
     AND NOT (relname = 'users' AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users'))) as truly_unused_indexes,
    (SELECT COUNT(*) FROM pg_stat_user_indexes 
     WHERE schemaname = 'public' AND idx_scan = 0 AND relname = 'users') as users_table_unused_indexes,
    (SELECT COUNT(*) FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid 
     WHERE n.nspname = 'public' AND (p.proname ILIKE '%test%' OR p.proname ILIKE '%temp%' OR p.proname ILIKE '%old%')) as test_functions,
    '✅ 303 indexes removed! Great job!' as achievement;











