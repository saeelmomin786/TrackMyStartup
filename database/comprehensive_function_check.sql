-- =====================================================
-- COMPREHENSIVE FUNCTION CHECK
-- =====================================================
-- Run this to see all critical function settings at once
-- =====================================================

-- 1. Function Owner and SECURITY DEFINER Status
SELECT 
    '1. Function Configuration' as check_section,
    proname as function_name,
    proowner::regrole::text as owner,
    CASE 
        WHEN proowner::regrole::text = 'postgres' THEN '✅ CORRECT'
        ELSE '❌ WRONG - Run fix_rpc_409_error.sql'
    END as owner_check,
    prosecdef as is_security_definer,
    CASE 
        WHEN prosecdef = true THEN '✅ ENABLED'
        ELSE '❌ DISABLED - Run fix_rpc_409_error.sql'
    END as security_definer_check
FROM pg_proc 
WHERE proname = 'increment_advisor_credits'
AND pronamespace = 'public'::regnamespace;

-- 2. Function Execute Permissions
SELECT 
    '2. Function Permissions' as check_section,
    r.rolname as role_name,
    has_function_privilege(r.rolname, p.oid, 'EXECUTE') as can_execute,
    CASE 
        WHEN has_function_privilege(r.rolname, p.oid, 'EXECUTE') THEN '✅ HAS PERMISSION'
        ELSE '❌ MISSING - Run fix_rpc_409_error.sql'
    END as permission_status
FROM pg_proc p
CROSS JOIN pg_roles r
WHERE p.proname = 'increment_advisor_credits'
AND p.pronamespace = 'public'::regnamespace
AND r.rolname IN ('authenticated', 'anon', 'service_role')
ORDER BY r.rolname;

-- 3. Table Permissions for postgres role (CRITICAL)
SELECT 
    '3. Table Permissions (postgres)' as check_section,
    table_name,
    STRING_AGG(privilege_type, ', ' ORDER BY privilege_type) as permissions,
    CASE 
        WHEN COUNT(*) >= 4 THEN '✅ HAS ALL PERMISSIONS'
        ELSE '❌ MISSING PERMISSIONS - Run fix_rpc_409_error.sql'
    END as permission_check
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
AND table_name IN ('advisor_credits', 'credit_purchase_history')
AND grantee = 'postgres'
GROUP BY table_name
ORDER BY table_name;

-- 4. RLS Status (should be disabled)
SELECT 
    '4. RLS Status' as check_section,
    tablename,
    rowsecurity as rls_enabled,
    CASE 
        WHEN rowsecurity = false THEN '✅ DISABLED (Correct)'
        ELSE '❌ ENABLED - Run fix_rpc_409_error.sql'
    END as rls_check
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('advisor_credits', 'credit_purchase_history')
ORDER BY tablename;

-- 5. Summary Check
SELECT 
    '5. SUMMARY' as check_section,
    (SELECT COUNT(*) FROM pg_proc WHERE proname = 'increment_advisor_credits' AND pronamespace = 'public'::regnamespace) as function_exists,
    (SELECT COUNT(*) FROM pg_proc p JOIN pg_roles r ON has_function_privilege(r.rolname, p.oid, 'EXECUTE') WHERE p.proname = 'increment_advisor_credits' AND p.pronamespace = 'public'::regnamespace AND r.rolname IN ('authenticated', 'anon', 'service_role')) as roles_with_permission,
    (SELECT COUNT(*) FROM information_schema.role_table_grants WHERE table_schema = 'public' AND table_name IN ('advisor_credits', 'credit_purchase_history') AND grantee = 'postgres') as postgres_table_permissions,
    CASE 
        WHEN (SELECT proowner::regrole::text FROM pg_proc WHERE proname = 'increment_advisor_credits' AND pronamespace = 'public'::regnamespace) = 'postgres'
        AND (SELECT prosecdef FROM pg_proc WHERE proname = 'increment_advisor_credits' AND pronamespace = 'public'::regnamespace) = true
        THEN '✅ ALL CHECKS PASS'
        ELSE '❌ NEEDS FIX - Run fix_rpc_409_error.sql'
    END as overall_status;
