-- =====================================================
-- QUICK FUNCTION STATUS CHECK
-- =====================================================
-- Run this to verify the function is configured correctly
-- =====================================================

-- Check function owner and SECURITY DEFINER status
SELECT 
    'Function Status' as check_type,
    proname as function_name,
    pg_get_function_identity_arguments(oid) as arguments,
    prosecdef as is_security_definer,
    proowner::regrole::text as owner,
    CASE 
        WHEN proowner::regrole::text = 'postgres' THEN '✅ CORRECT'
        ELSE '❌ WRONG - Should be postgres'
    END as owner_status,
    CASE 
        WHEN prosecdef = true THEN '✅ ENABLED'
        ELSE '❌ DISABLED'
    END as security_definer_status
FROM pg_proc 
WHERE proname = 'increment_advisor_credits'
AND pronamespace = 'public'::regnamespace;

-- Check function execute permissions
SELECT 
    'Function Permissions' as check_type,
    p.proname as function_name,
    r.rolname as role_name,
    has_function_privilege(r.rolname, p.oid, 'EXECUTE') as can_execute,
    CASE 
        WHEN has_function_privilege(r.rolname, p.oid, 'EXECUTE') THEN '✅ YES'
        ELSE '❌ NO'
    END as permission_status
FROM pg_proc p
CROSS JOIN pg_roles r
WHERE p.proname = 'increment_advisor_credits'
AND p.pronamespace = 'public'::regnamespace
AND r.rolname IN ('authenticated', 'anon', 'service_role', 'postgres')
ORDER BY r.rolname;

-- Check table permissions for postgres role
SELECT 
    'Table Permissions (postgres)' as check_type,
    table_name,
    grantee,
    privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
AND table_name IN ('advisor_credits', 'credit_purchase_history')
AND grantee = 'postgres'
ORDER BY table_name, privilege_type;

-- Check RLS status
SELECT 
    'RLS Status' as check_type,
    schemaname,
    tablename,
    rowsecurity as rls_enabled,
    CASE 
        WHEN rowsecurity = false THEN '✅ DISABLED (Good)'
        ELSE '⚠️ ENABLED (May cause issues)'
    END as rls_status
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('advisor_credits', 'credit_purchase_history')
ORDER BY tablename;
