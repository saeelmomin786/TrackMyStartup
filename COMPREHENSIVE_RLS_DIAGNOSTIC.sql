-- =====================================================
-- COMPREHENSIVE RLS DIAGNOSTIC FOR INVESTMENT ADVISOR
-- =====================================================
-- This script checks ALL tables that Investment Advisors
-- need to access and identifies RLS issues
-- =====================================================

-- 1. Check which tables have RLS enabled but no policies
SELECT 
    'Tables with RLS but NO policies' as category,
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables t
LEFT JOIN pg_policies p ON p.schemaname = t.schemaname AND p.tablename = t.tablename
WHERE t.schemaname = 'public'
AND EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relname = t.tablename
    AND n.nspname = t.schemaname
    AND c.relrowsecurity = true
)
AND p.policyname IS NULL
ORDER BY tablename;

-- 2. Check tables that Investment Advisors commonly access
-- and verify they have SELECT policies
WITH advisor_tables AS (
    SELECT unnest(ARRAY[
        'advisor_added_investors',
        'advisor_added_startups',
        'investment_advisor_relationships',
        'investment_advisor_recommendations',
        'due_diligence_requests',
        'co_investment_opportunities',
        'co_investment_offers',
        'co_investment_interests',
        'co_investment_approvals',
        'investment_offers',
        'investor_favorites',
        'investor_profiles',
        'startups',
        'users',
        'new_investments',
        'investment_records',
        'advisor_mandates',
        'advisor_mandate_investors',
        'startup_addition_requests',
        'investor_connection_requests',
        'advisor_connection_requests'
    ]) as table_name
)
SELECT 
    'Investment Advisor table access check' as category,
    at.table_name,
    CASE 
        WHEN NOT EXISTS (
            SELECT 1 FROM pg_class c
            JOIN pg_namespace n ON n.oid = c.relnamespace
            WHERE c.relname = at.table_name
            AND n.nspname = 'public'
        ) THEN '❌ Table does not exist'
        WHEN NOT EXISTS (
            SELECT 1 FROM pg_class c
            JOIN pg_namespace n ON n.oid = c.relnamespace
            WHERE c.relname = at.table_name
            AND n.nspname = 'public'
            AND c.relrowsecurity = true
        ) THEN '⚠️ RLS not enabled'
        WHEN NOT EXISTS (
            SELECT 1 FROM pg_policies p
            WHERE p.schemaname = 'public'
            AND p.tablename = at.table_name
            AND p.cmd = 'SELECT'
        ) THEN '❌ No SELECT policy'
        WHEN NOT EXISTS (
            SELECT 1 FROM pg_policies p
            WHERE p.schemaname = 'public'
            AND p.tablename = at.table_name
            AND p.cmd = 'SELECT'
            AND (
                p.qual LIKE '%auth.uid()%' 
                OR p.qual LIKE '%auth.uid()%'
                OR p.with_check LIKE '%auth.uid()%'
            )
        ) THEN '⚠️ SELECT policy exists but may not use auth.uid()'
        ELSE '✅ Has SELECT policy'
    END as status,
    (
        SELECT COUNT(*) 
        FROM pg_policies p
        WHERE p.schemaname = 'public'
        AND p.tablename = at.table_name
    ) as total_policies,
    (
        SELECT COUNT(*) 
        FROM pg_policies p
        WHERE p.schemaname = 'public'
        AND p.tablename = at.table_name
        AND p.cmd = 'SELECT'
    ) as select_policies,
    (
        SELECT COUNT(*) 
        FROM pg_policies p
        WHERE p.schemaname = 'public'
        AND p.tablename = at.table_name
        AND p.cmd = 'INSERT'
    ) as insert_policies,
    (
        SELECT COUNT(*) 
        FROM pg_policies p
        WHERE p.schemaname = 'public'
        AND p.tablename = at.table_name
        AND p.cmd = 'UPDATE'
    ) as update_policies
FROM advisor_tables at
ORDER BY at.table_name;

-- 3. Check for tables with FK to users(id) that might have RLS issues
SELECT 
    'Tables with FK to users(id) - RLS check' as category,
    tc.table_name,
    kcu.column_name as fk_column,
    (
        SELECT COUNT(*) 
        FROM pg_policies p
        WHERE p.schemaname = 'public'
        AND p.tablename = tc.table_name
        AND p.cmd = 'SELECT'
    ) as select_policies,
    CASE 
        WHEN NOT EXISTS (
            SELECT 1 FROM pg_policies p
            WHERE p.schemaname = 'public'
            AND p.tablename = tc.table_name
            AND p.cmd = 'SELECT'
            AND (
                p.qual LIKE '%' || kcu.column_name || '% = auth.uid()%'
                OR p.qual LIKE '%auth.uid()% = ' || kcu.column_name || '%'
            )
        ) THEN '⚠️ SELECT policy may not use FK column with auth.uid()'
        ELSE '✅ SELECT policy uses FK column'
    END as fk_usage_status
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
AND tc.table_schema = 'public'
AND EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage ccu
    WHERE ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
    AND ccu.table_name = 'users'
    AND ccu.column_name = 'id'
)
ORDER BY tc.table_name;

-- 4. Check for policies that use profile ID fallback (problematic)
SELECT 
    'Policies with profile ID fallback (needs fix)' as category,
    schemaname,
    tablename,
    policyname,
    cmd,
    CASE 
        WHEN qual LIKE '%user_profiles%' AND qual LIKE '%auth_user_id%' THEN 'Uses profile fallback'
        WHEN with_check LIKE '%user_profiles%' AND with_check LIKE '%auth_user_id%' THEN 'Uses profile fallback in WITH CHECK'
        ELSE 'Other'
    END as issue_type
FROM pg_policies
WHERE schemaname = 'public'
AND (
    qual LIKE '%user_profiles%' 
    OR with_check LIKE '%user_profiles%'
)
AND (
    qual LIKE '%auth_user_id%'
    OR with_check LIKE '%auth_user_id%'
)
ORDER BY tablename, policyname;

-- 5. Check advisor_mandates and advisor_mandate_investors specifically
SELECT 
    'Advisor Mandates RLS Check' as category,
    'advisor_mandates' as table_name,
    COUNT(*) as total_policies,
    COUNT(CASE WHEN cmd = 'SELECT' THEN 1 END) as select_policies,
    COUNT(CASE WHEN cmd = 'INSERT' THEN 1 END) as insert_policies,
    COUNT(CASE WHEN cmd = 'UPDATE' THEN 1 END) as update_policies,
    COUNT(CASE WHEN cmd = 'DELETE' THEN 1 END) as delete_policies,
    STRING_AGG(DISTINCT cmd, ', ') as policy_types
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'advisor_mandates'

UNION ALL

SELECT 
    'Advisor Mandates RLS Check' as category,
    'advisor_mandate_investors' as table_name,
    COUNT(*) as total_policies,
    COUNT(CASE WHEN cmd = 'SELECT' THEN 1 END) as select_policies,
    COUNT(CASE WHEN cmd = 'INSERT' THEN 1 END) as insert_policies,
    COUNT(CASE WHEN cmd = 'UPDATE' THEN 1 END) as update_policies,
    COUNT(CASE WHEN cmd = 'DELETE' THEN 1 END) as delete_policies,
    STRING_AGG(DISTINCT cmd, ', ') as policy_types
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'advisor_mandate_investors';

-- 6. Show actual policy definitions for advisor_mandates
SELECT 
    'Advisor Mandates Policy Details' as category,
    tablename,
    policyname,
    cmd,
    roles,
    qual as using_expression,
    with_check as with_check_expression
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('advisor_mandates', 'advisor_mandate_investors')
ORDER BY tablename, cmd, policyname;



