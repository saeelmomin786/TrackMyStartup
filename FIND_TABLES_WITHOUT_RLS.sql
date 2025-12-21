-- =====================================================
-- FIND TABLES WITHOUT RLS POLICIES
-- =====================================================
-- Identifies tables that don't have Row Level Security policies
-- This is important for security!

-- =====================================================
-- 1. TABLES WITHOUT RLS POLICIES
-- =====================================================
SELECT 
    '=== TABLES WITHOUT RLS POLICIES ===' as section,
    t.tablename,
    CASE 
        WHEN t.rowsecurity THEN '✅ RLS Enabled (but no policies!)'
        ELSE '⚠️ RLS Disabled (security risk!)'
    END as rls_status,
    (SELECT COUNT(*) FROM pg_policy p 
     JOIN pg_class c ON p.polrelid = c.oid 
     JOIN pg_namespace n ON c.relnamespace = n.oid
     WHERE c.relname = t.tablename AND n.nspname = 'public') as policy_count,
    pg_size_pretty(pg_total_relation_size('public.'||t.tablename)) as table_size,
    (SELECT n_live_tup FROM pg_stat_user_tables WHERE relname = t.tablename) as row_count,
    CASE 
        WHEN t.tablename LIKE 'pg_%' OR t.tablename LIKE '_pg_%' THEN 'ℹ️ System table - RLS may not be needed'
        ELSE '⚠️ User table - Should have RLS policies'
    END as security_note
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
  AND t.tablename NOT LIKE 'pg_%'  -- Exclude system tables
  AND t.tablename NOT LIKE '_pg_%'  -- Exclude system tables
ORDER BY 
    CASE WHEN t.rowsecurity THEN 0 ELSE 1 END,  -- Show disabled RLS first
    t.tablename;

-- =====================================================
-- 2. TABLES WITH RLS DISABLED (Security Risk!)
-- =====================================================
SELECT 
    '=== TABLES WITH RLS DISABLED (CRITICAL!) ===' as section,
    tablename,
    (SELECT COUNT(*) FROM pg_policy p 
     JOIN pg_class c ON p.polrelid = c.oid 
     JOIN pg_namespace n ON c.relnamespace = n.oid
     WHERE c.relname = tablename AND n.nspname = 'public') as policy_count,
    pg_size_pretty(pg_total_relation_size('public.'||tablename)) as table_size,
    (SELECT n_live_tup FROM pg_stat_user_tables WHERE relname = tablename) as row_count,
    'ALTER TABLE public.' || quote_ident(tablename) || ' ENABLE ROW LEVEL SECURITY;' as enable_rls_statement
FROM pg_tables
WHERE schemaname = 'public'
  AND NOT rowsecurity  -- RLS disabled
  AND tablename NOT LIKE 'pg_%'
  AND tablename NOT LIKE '_pg_%'
ORDER BY tablename;

-- =====================================================
-- 3. SUMMARY STATISTICS
-- =====================================================
SELECT 
    '=== RLS POLICY SUMMARY ===' as section,
    (SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public' AND tablename NOT LIKE 'pg_%' AND tablename NOT LIKE '_pg_%') as total_user_tables,
    (SELECT COUNT(DISTINCT c.relname)
     FROM pg_policy p
     JOIN pg_class c ON p.polrelid = c.oid
     JOIN pg_namespace n ON c.relnamespace = n.oid
     WHERE n.nspname = 'public') as tables_with_policies,
    (SELECT COUNT(*) FROM pg_tables t
     LEFT JOIN (
         SELECT DISTINCT c.relname
         FROM pg_policy p
         JOIN pg_class c ON p.polrelid = c.oid
         JOIN pg_namespace n ON c.relnamespace = n.oid
         WHERE n.nspname = 'public'
     ) policies ON policies.relname = t.tablename
     WHERE t.schemaname = 'public'
       AND policies.relname IS NULL
       AND t.tablename NOT LIKE 'pg_%'
       AND t.tablename NOT LIKE '_pg_%') as tables_without_policies,
    (SELECT COUNT(*) FROM pg_tables 
     WHERE schemaname = 'public' 
       AND NOT rowsecurity 
       AND tablename NOT LIKE 'pg_%' 
       AND tablename NOT LIKE '_pg_%') as tables_with_rls_disabled,
    CASE 
        WHEN (SELECT COUNT(*) FROM pg_tables 
              WHERE schemaname = 'public' 
                AND NOT rowsecurity 
                AND tablename NOT LIKE 'pg_%' 
                AND tablename NOT LIKE '_pg_%') > 0
        THEN '⚠️ Some tables have RLS disabled - Security risk!'
        ELSE '✅ All tables have RLS enabled'
    END as security_status;





