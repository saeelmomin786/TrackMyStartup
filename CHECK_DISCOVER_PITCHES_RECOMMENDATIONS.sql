-- =====================================================
-- CHECK DISCOVER PITCHES & RECOMMENDATIONS
-- =====================================================
-- Verify RLS policies and data access for:
-- 1. Discover Pitches section
-- 2. Recommendations functionality
-- =====================================================

-- =====================================================
-- STEP 1: Check investment_advisor_recommendations RLS
-- =====================================================

SELECT 'Step 1: investment_advisor_recommendations RLS Policies' as check_step;
SELECT 
    policyname,
    cmd,
    CASE 
        WHEN qual LIKE '%auth.uid()%' THEN '✅ Uses auth.uid()'
        WHEN qual LIKE '%current_setting%' THEN '❌ Uses current_setting (WRONG)'
        ELSE '⚠️ Check manually'
    END as auth_method,
    CASE 
        WHEN qual LIKE '%investment_advisor_id%' AND qual LIKE '%auth.uid()%' THEN '✅ Investment Advisor can view their recommendations'
        WHEN qual LIKE '%investor_id%' AND qual LIKE '%auth.uid()%' THEN '✅ Investor can view recommendations'
        ELSE 'Other'
    END as policy_type,
    qual as policy_expression
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'investment_advisor_recommendations'
ORDER BY cmd, policyname;

-- =====================================================
-- STEP 2: Check due_diligence_requests RLS
-- =====================================================

SELECT 'Step 2: due_diligence_requests RLS Policies' as check_step;
SELECT 
    policyname,
    cmd,
    CASE 
        WHEN qual LIKE '%auth.uid()%' THEN '✅ Uses auth.uid()'
        WHEN qual LIKE '%current_setting%' THEN '❌ Uses current_setting (WRONG)'
        ELSE '⚠️ Check manually'
    END as auth_method,
    CASE 
        WHEN qual LIKE '%Investment Advisor%' OR qual LIKE '%investment_advisor%' THEN '✅ Has Investment Advisor policy'
        ELSE 'Other'
    END as policy_type,
    qual as policy_expression
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'due_diligence_requests'
AND (qual LIKE '%Investment Advisor%' OR qual LIKE '%investment_advisor%')
ORDER BY cmd, policyname;

-- =====================================================
-- STEP 3: Check startups table access (for Discover Pitches)
-- =====================================================

SELECT 'Step 3: startups table access for Discover Pitches' as check_step;
SELECT 
    policyname,
    cmd,
    CASE 
        WHEN qual = 'true' THEN '✅ Public read (allows all)'
        WHEN qual LIKE '%Public%' THEN '✅ Public policy'
        WHEN qual LIKE '%Investment Advisor%' AND qual LIKE '%auth.uid()%' THEN '✅ Investment Advisor policy with auth.uid()'
        WHEN qual LIKE '%Investment Advisor%' THEN '⚠️ Investment Advisor policy (check auth method)'
        ELSE 'Other'
    END as access_type
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'startups'
AND cmd = 'SELECT'
AND (qual LIKE '%Investment Advisor%' OR qual = 'true' OR qual LIKE '%Public%')
ORDER BY policyname;

-- =====================================================
-- STEP 4: Check data availability
-- =====================================================

SELECT 'Step 4: Data Availability Check' as check_step;
SELECT 
    'investment_advisor_recommendations' as table_name,
    COUNT(*) as total_recommendations,
    COUNT(DISTINCT investment_advisor_id) as unique_advisors,
    COUNT(DISTINCT investor_id) as unique_investors,
    COUNT(DISTINCT startup_id) as unique_startups
FROM public.investment_advisor_recommendations
UNION ALL
SELECT 
    'due_diligence_requests' as table_name,
    COUNT(*) as total_requests,
    COUNT(DISTINCT user_id) as unique_users,
    COUNT(DISTINCT startup_id) as unique_startups,
    0 as placeholder
FROM public.due_diligence_requests;

-- =====================================================
-- STEP 5: Verify RLS is enabled
-- =====================================================

SELECT 'Step 5: RLS Enabled Status' as check_step;
SELECT 
    tablename,
    rowsecurity as rls_enabled,
    CASE 
        WHEN rowsecurity THEN '✅ RLS Enabled'
        ELSE '❌ RLS NOT Enabled'
    END as status
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN (
    'investment_advisor_recommendations',
    'due_diligence_requests',
    'startups'
)
ORDER BY tablename;

-- =====================================================
-- STEP 6: Check if Investment Advisors can view recommendations
-- =====================================================

SELECT 'Step 6: Investment Advisor Recommendations Access' as check_step;
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_policies
            WHERE schemaname = 'public'
            AND tablename = 'investment_advisor_recommendations'
            AND cmd = 'SELECT'
            AND qual LIKE '%investment_advisor_id%'
            AND qual LIKE '%auth.uid()%'
        ) THEN '✅ Investment Advisors can view their recommendations'
        ELSE '❌ Investment Advisors CANNOT view recommendations'
    END as recommendations_access,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_policies
            WHERE schemaname = 'public'
            AND tablename = 'investment_advisor_recommendations'
            AND cmd = 'INSERT'
            AND qual LIKE '%investment_advisor_id%'
            AND qual LIKE '%auth.uid()%'
        ) THEN '✅ Investment Advisors can create recommendations'
        ELSE '❌ Investment Advisors CANNOT create recommendations'
    END as create_access;

-- =====================================================
-- STEP 7: Check if Investment Advisors can view due diligence
-- =====================================================

SELECT 'Step 7: Investment Advisor Due Diligence Access' as check_step;
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_policies
            WHERE schemaname = 'public'
            AND tablename = 'due_diligence_requests'
            AND cmd = 'SELECT'
            AND (qual LIKE '%Investment Advisor%' OR qual LIKE '%investment_advisor%')
            AND qual LIKE '%auth.uid()%'
        ) THEN '✅ Investment Advisors can view due diligence requests'
        ELSE '❌ Investment Advisors CANNOT view due diligence requests'
    END as due_diligence_access;

-- =====================================================
-- FINAL SUMMARY
-- =====================================================

SELECT 'FINAL SUMMARY: Discover Pitches & Recommendations' as summary;
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_policies
            WHERE schemaname = 'public'
            AND tablename = 'investment_advisor_recommendations'
            AND cmd = 'SELECT'
            AND qual LIKE '%investment_advisor_id%'
            AND qual LIKE '%auth.uid()%'
        ) AND EXISTS (
            SELECT 1 FROM pg_policies
            WHERE schemaname = 'public'
            AND tablename = 'investment_advisor_recommendations'
            AND cmd = 'INSERT'
            AND qual LIKE '%investment_advisor_id%'
            AND qual LIKE '%auth.uid()%'
        ) THEN '✅ Recommendations working properly'
        ELSE '❌ Recommendations may not work'
    END as recommendations_status,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_policies
            WHERE schemaname = 'public'
            AND tablename = 'due_diligence_requests'
            AND cmd = 'SELECT'
            AND (qual LIKE '%Investment Advisor%' OR qual LIKE '%investment_advisor%')
            AND qual LIKE '%auth.uid()%'
        ) THEN '✅ Due Diligence working properly'
        ELSE '❌ Due Diligence may not work'
    END as due_diligence_status,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_policies
            WHERE schemaname = 'public'
            AND tablename = 'startups'
            AND cmd = 'SELECT'
            AND (qual LIKE '%Investment Advisor%' OR qual = 'true' OR qual LIKE '%Public%')
        ) THEN '✅ Discover Pitches can access startups'
        ELSE '❌ Discover Pitches may not access startups'
    END as discover_pitches_status;




