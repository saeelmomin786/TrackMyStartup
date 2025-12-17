-- =====================================================
-- VERIFY DISCOVER PITCHES & RECOMMENDATIONS WORKING
-- =====================================================
-- Comprehensive check for Discover Pitches section
-- =====================================================

-- =====================================================
-- STEP 1: Verify investment_advisor_recommendations RLS
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
        WHEN cmd = 'SELECT' AND qual LIKE '%investment_advisor_id%' THEN '✅ Investment Advisor can view their recommendations'
        WHEN cmd = 'INSERT' AND qual LIKE '%investment_advisor_id%' THEN '✅ Investment Advisor can create recommendations'
        WHEN cmd = 'UPDATE' AND qual LIKE '%investment_advisor_id%' THEN '✅ Investment Advisor can update recommendations'
        ELSE 'Other'
    END as policy_type
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'investment_advisor_recommendations'
ORDER BY cmd, policyname;

-- =====================================================
-- STEP 2: Verify due_diligence_requests RLS
-- =====================================================

SELECT 'Step 2: due_diligence_requests RLS Policies (for Investment Advisors)' as check_step;
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
        WHEN qual LIKE '%user_id%' AND qual LIKE '%auth.uid()%' THEN '✅ Users can view their own requests'
        ELSE 'Other'
    END as policy_type
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'due_diligence_requests'
AND cmd = 'SELECT'
ORDER BY policyname;

-- =====================================================
-- STEP 3: Verify startups table access
-- =====================================================

SELECT 'Step 3: startups table access for Discover Pitches' as check_step;
SELECT 
    policyname,
    cmd,
    CASE 
        WHEN qual = 'true' THEN '✅ Public read (allows all)'
        WHEN qual LIKE '%Public%' THEN '✅ Public policy'
        WHEN qual LIKE '%Investment Advisor%' AND qual LIKE '%auth.uid()%' THEN '✅ Investment Advisor policy with auth.uid()'
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

SELECT 'Step 4: Data Availability' as check_step;
SELECT 
    'investment_advisor_recommendations' as table_name,
    COUNT(*) as total_records,
    COUNT(DISTINCT investment_advisor_id) as unique_advisors,
    COUNT(DISTINCT investor_id) as unique_investors,
    COUNT(DISTINCT startup_id) as unique_startups
FROM public.investment_advisor_recommendations
UNION ALL
SELECT 
    'due_diligence_requests' as table_name,
    COUNT(*) as total_records,
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
-- STEP 6: Check collaborator_recommendations (if exists)
-- =====================================================

SELECT 'Step 6: collaborator_recommendations table check' as check_step;
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'collaborator_recommendations'
        ) THEN '✅ Table exists'
        ELSE '⚠️ Table does not exist (may be optional)'
    END as table_status,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_policies
            WHERE schemaname = 'public'
            AND tablename = 'collaborator_recommendations'
            AND qual LIKE '%auth.uid()%'
        ) THEN '✅ Has RLS policy with auth.uid()'
        WHEN EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'collaborator_recommendations'
        ) THEN '⚠️ Table exists but may need RLS policy'
        ELSE 'N/A'
    END as rls_status;

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
        ELSE '❌ Recommendations may not work - check policies'
    END as recommendations_status,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_policies
            WHERE schemaname = 'public'
            AND tablename = 'due_diligence_requests'
            AND cmd = 'SELECT'
            AND qual LIKE '%auth.uid()%'
        ) THEN '✅ Due Diligence working properly'
        ELSE '❌ Due Diligence may not work - check policies'
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
    END as discover_pitches_status,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_tables
            WHERE schemaname = 'public'
            AND tablename = 'investment_advisor_recommendations'
            AND rowsecurity = true
        ) AND EXISTS (
            SELECT 1 FROM pg_tables
            WHERE schemaname = 'public'
            AND tablename = 'due_diligence_requests'
            AND rowsecurity = true
        ) THEN '✅ All tables have RLS enabled'
        ELSE '⚠️ Some tables may not have RLS enabled'
    END as rls_enabled_status;


