-- =====================================================
-- SECURITY FIXES VERIFICATION SCRIPT
-- =====================================================
-- Run this after implementing security_fixes.sql
-- This will verify that all security issues have been addressed

-- =====================================================
-- 1. CHECK ROW LEVEL SECURITY STATUS
-- =====================================================
SELECT 
    'RLS Status Check' as test_name,
    schemaname,
    tablename,
    CASE 
        WHEN rowsecurity THEN '✅ RLS Enabled'
        ELSE '❌ RLS Disabled'
    END as status
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN (
    'company_types',
    'compliance_rules_new', 
    'diligence_status_log',
    'compliance_access',
    'auditor_types',
    'governance_types',
    'compliance_rules_comprehensive'
)
ORDER BY tablename;

-- =====================================================
-- 2. CHECK FUNCTION SEARCH PATHS
-- =====================================================
SELECT 
    'Function Search Path Check' as test_name,
    n.nspname||'.'||p.proname as function_name,
    CASE 
        WHEN p.proconfig IS NOT NULL AND 'search_path' = ANY(p.proconfig) THEN '✅ Search Path Set'
        ELSE '❌ Search Path Not Set'
    END as status
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND p.prokind = 'f'
AND p.proname IN (
    'update_service_providers_updated_at',
    'get_fundraising_status',
    'is_admin',
    'is_startup',
    'is_investor'
)
ORDER BY p.proname;

-- =====================================================
-- 3. CHECK SECURITY DEFINER VIEWS
-- =====================================================
SELECT 
    'Security Definer Views Check' as test_name,
    schemaname,
    viewname,
    CASE 
        WHEN definition LIKE '%SECURITY DEFINER%' THEN '⚠️ SECURITY DEFINER'
        ELSE '✅ Regular View'
    END as status
FROM pg_views 
WHERE schemaname = 'public' 
AND viewname IN (
    'investment_advisor_dashboard_metrics',
    'v_incubation_opportunities',
    'investment_advisor_startups',
    'compliance_rules_view'
);

-- =====================================================
-- 4. CHECK FOR ANY REMAINING SECURITY ISSUES
-- =====================================================

-- Check for tables without RLS
SELECT 
    'Tables Without RLS' as test_name,
    schemaname,
    tablename,
    '❌ RLS Not Enabled' as status
FROM pg_tables 
WHERE schemaname = 'public' 
AND rowsecurity = false
AND tablename NOT LIKE 'pg_%'
AND tablename NOT IN (
    -- Exclude system tables that don't need RLS
    'spatial_ref_sys'
);

-- Check for functions without search_path
SELECT 
    'Functions Without Search Path' as test_name,
    n.nspname||'.'||p.proname as function_name,
    '❌ Search Path Not Set' as status
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND p.prokind = 'f'
AND (p.proconfig IS NULL OR 'search_path' != ALL(p.proconfig))
ORDER BY p.proname;

-- =====================================================
-- 5. SUMMARY REPORT
-- =====================================================
WITH rls_check AS (
    SELECT COUNT(*) as total_tables,
           COUNT(*) FILTER (WHERE rowsecurity = true) as rls_enabled
    FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename NOT LIKE 'pg_%'
),
function_check AS (
    SELECT COUNT(*) as total_functions,
           COUNT(*) FILTER (WHERE p.proconfig IS NOT NULL AND 'search_path' = ANY(p.proconfig)) as search_path_set
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
    AND p.prokind = 'f'
)
SELECT 
    'SECURITY FIXES SUMMARY' as report_type,
    'Tables with RLS: ' || rls_enabled || '/' || total_tables as rls_status,
    'Functions with search_path: ' || search_path_set || '/' || total_functions as function_status,
    CASE 
        WHEN rls_enabled = total_tables AND search_path_set = total_functions 
        THEN '✅ All Security Issues Fixed'
        ELSE '⚠️ Some Issues Remain'
    END as overall_status
FROM rls_check, function_check;

-- =====================================================
-- 6. PERFORMANCE IMPACT CHECK
-- =====================================================
-- Check if RLS policies are causing performance issues
SELECT 
    'Performance Check' as test_name,
    schemaname,
    tablename,
    'Check query performance' as note
FROM pg_tables 
WHERE schemaname = 'public' 
AND rowsecurity = true
ORDER BY tablename;






