-- =====================================================
-- LIST TABLES NEEDING RLS (Detailed Breakdown)
-- =====================================================

-- =====================================================
-- 1. TABLES WITH RLS DISABLED (CRITICAL - Enable First!)
-- =====================================================
SELECT 
    '=== TABLES WITH RLS DISABLED (CRITICAL!) ===' as section,
    tablename,
    (SELECT n_live_tup FROM pg_stat_user_tables WHERE relname = tablename) as row_count,
    pg_size_pretty(pg_total_relation_size('public.'||tablename)) as table_size,
    'ALTER TABLE public.' || quote_ident(tablename) || ' ENABLE ROW LEVEL SECURITY;' as enable_rls_statement,
    '⚠️ CRITICAL: RLS disabled - Enable immediately!' as priority
FROM pg_tables
WHERE schemaname = 'public'
  AND NOT rowsecurity  -- RLS disabled
  AND tablename NOT LIKE 'pg_%'
  AND tablename NOT LIKE '_pg_%'
ORDER BY tablename;

-- =====================================================
-- 2. TABLES WITH RLS ENABLED BUT NO POLICIES
-- =====================================================
SELECT 
    '=== TABLES WITH RLS ENABLED BUT NO POLICIES ===' as section,
    t.tablename,
    (SELECT n_live_tup FROM pg_stat_user_tables WHERE relname = t.tablename) as row_count,
    pg_size_pretty(pg_total_relation_size('public.'||t.tablename)) as table_size,
    CASE 
        WHEN t.rowsecurity THEN '✅ RLS Enabled (but no policies - will deny all access)'
        ELSE '⚠️ RLS Disabled'
    END as rls_status,
    '⚠️ Need to add RLS policies' as action_needed
FROM pg_tables t
LEFT JOIN (
    SELECT DISTINCT c.relname
    FROM pg_policy p
    JOIN pg_class c ON p.polrelid = c.oid
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE n.nspname = 'public'
) policies ON policies.relname = t.tablename
WHERE t.schemaname = 'public'
  AND policies.relname IS NULL  -- No policies
  AND t.tablename NOT LIKE 'pg_%'
  AND t.tablename NOT LIKE '_pg_%'
ORDER BY t.tablename;

-- =====================================================
-- 3. COMPLETE LIST: All 8 tables needing attention
-- =====================================================
SELECT 
    '=== ALL TABLES NEEDING RLS ATTENTION ===' as section,
    t.tablename,
    CASE 
        WHEN NOT t.rowsecurity THEN '🔴 RLS Disabled - Enable RLS'
        WHEN policies.relname IS NULL THEN '🟡 RLS Enabled - Add Policies'
        ELSE '✅ Has Policies'
    END as status,
    (SELECT n_live_tup FROM pg_stat_user_tables WHERE relname = t.tablename) as row_count,
    pg_size_pretty(pg_total_relation_size('public.'||t.tablename)) as table_size
FROM pg_tables t
LEFT JOIN (
    SELECT DISTINCT c.relname
    FROM pg_policy p
    JOIN pg_class c ON p.polrelid = c.oid
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE n.nspname = 'public'
) policies ON policies.relname = t.tablename
WHERE t.schemaname = 'public'
  AND (
      NOT t.rowsecurity  -- RLS disabled
      OR policies.relname IS NULL  -- No policies
  )
  AND t.tablename NOT LIKE 'pg_%'
  AND t.tablename NOT LIKE '_pg_%'
ORDER BY 
    CASE WHEN NOT t.rowsecurity THEN 0 ELSE 1 END,  -- Disabled first
    t.tablename;















