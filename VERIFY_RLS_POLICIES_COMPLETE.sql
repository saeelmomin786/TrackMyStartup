-- =====================================================
-- VERIFY ALL RLS POLICIES ARE CORRECT
-- =====================================================
-- Run this after FIX_ALL_RLS_POLICIES_DYNAMIC.sql
-- to verify all policies are correctly set up
-- =====================================================

-- =====================================================
-- Check 1: Tables with RLS but no policies
-- =====================================================
SELECT 
    'Tables with RLS but no policies' as check_type,
    t.tablename,
    'MISSING POLICIES' as status
FROM pg_tables t
WHERE t.schemaname = 'public'
AND EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE c.relname = t.tablename
    AND n.nspname = t.schemaname
    AND c.relrowsecurity = true
)
AND NOT EXISTS (
    SELECT 1 FROM pg_policies p
    WHERE p.tablename = t.tablename
    AND p.schemaname = 'public'
)
ORDER BY t.tablename;

-- =====================================================
-- Check 2: Tables with FK to users(id) but policies using profile IDs
-- =====================================================
SELECT DISTINCT
    'Potential FK constraint violation' as check_type,
    tc.table_name,
    kcu.column_name,
    'Policy may allow profile IDs but FK requires users.id' as issue
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema = 'public'
    AND ccu.table_name = 'users'
    AND ccu.column_name = 'id'
    AND EXISTS (
        SELECT 1 FROM pg_policies p
        WHERE p.tablename = tc.table_name
        AND p.schemaname = 'public'
        AND (
            p.qual LIKE '%user_profiles%'
            OR p.with_check LIKE '%user_profiles%'
        )
        AND NOT (
            p.qual LIKE '%auth.uid()%'
            OR p.with_check LIKE '%auth.uid()%'
        )
    )
ORDER BY tc.table_name;

-- =====================================================
-- Check 3: Policy coverage (INSERT, SELECT, UPDATE, DELETE)
-- =====================================================
SELECT 
    'Policy coverage check' as check_type,
    tablename,
    COUNT(CASE WHEN cmd = 'INSERT' THEN 1 END) as insert_policies,
    COUNT(CASE WHEN cmd = 'SELECT' THEN 1 END) as select_policies,
    COUNT(CASE WHEN cmd = 'UPDATE' THEN 1 END) as update_policies,
    COUNT(CASE WHEN cmd = 'DELETE' THEN 1 END) as delete_policies,
    CASE 
        WHEN COUNT(CASE WHEN cmd = 'INSERT' THEN 1 END) = 0 THEN 'MISSING INSERT'
        WHEN COUNT(CASE WHEN cmd = 'SELECT' THEN 1 END) = 0 THEN 'MISSING SELECT'
        WHEN COUNT(CASE WHEN cmd = 'UPDATE' THEN 1 END) = 0 THEN 'MISSING UPDATE'
        ELSE 'OK'
    END as status
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY tablename
HAVING COUNT(CASE WHEN cmd = 'INSERT' THEN 1 END) = 0
   OR COUNT(CASE WHEN cmd = 'SELECT' THEN 1 END) = 0
ORDER BY tablename;

-- =====================================================
-- Check 4: Summary statistics
-- =====================================================
SELECT 
    'Summary' as check_type,
    COUNT(DISTINCT tablename) as tables_with_policies,
    COUNT(*) as total_policies,
    COUNT(DISTINCT CASE WHEN cmd = 'INSERT' THEN tablename END) as tables_with_insert,
    COUNT(DISTINCT CASE WHEN cmd = 'SELECT' THEN tablename END) as tables_with_select,
    COUNT(DISTINCT CASE WHEN cmd = 'UPDATE' THEN tablename END) as tables_with_update,
    COUNT(DISTINCT CASE WHEN cmd = 'DELETE' THEN tablename END) as tables_with_delete
FROM pg_policies
WHERE schemaname = 'public';

-- =====================================================
-- Check 5: Tables that should have RLS but don't
-- =====================================================
SELECT 
    'Tables with user references but no RLS' as check_type,
    t.tablename,
    'RLS NOT ENABLED' as status
FROM pg_tables t
WHERE t.schemaname = 'public'
AND EXISTS (
    SELECT 1 FROM information_schema.columns c
    WHERE c.table_schema = 'public'
    AND c.table_name = t.tablename
    AND (
        c.column_name LIKE '%user_id%'
        OR c.column_name LIKE '%investor_id%'
        OR c.column_name LIKE '%advisor_id%'
        OR c.column_name LIKE '%mentor_id%'
    )
)
AND NOT EXISTS (
    SELECT 1 FROM pg_class cls
    JOIN pg_namespace n ON cls.relnamespace = n.oid
    WHERE cls.relname = t.tablename
    AND n.nspname = t.schemaname
    AND cls.relrowsecurity = true
)
ORDER BY t.tablename;



