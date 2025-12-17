-- =====================================================
-- DIAGNOSE WHY DATA IS NOT SHOWING
-- =====================================================
-- Since all policies exist, check:
-- 1. Policy expressions are correct
-- 2. Data exists
-- 3. Policy logic matches frontend expectations
-- =====================================================

-- =====================================================
-- STEP 1: Check Policy Expressions
-- =====================================================

-- 1.1: advisor_connection_requests - Must use auth.uid()
SELECT '1.1: advisor_connection_requests policy check' as check_step;
SELECT 
    policyname,
    CASE 
        WHEN qual LIKE '%auth.uid()%' THEN '✅ Uses auth.uid()'
        WHEN qual LIKE '%current_setting%' THEN '⚠️ Uses current_setting (may not work)'
        ELSE '❌ Check auth method'
    END as auth_method,
    qual as full_expression
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'advisor_connection_requests'
AND (qual LIKE '%Investment Advisor%' OR qual LIKE '%advisor_id%')
LIMIT 1;

-- 1.2: investment_offers - Investor Offers policy
SELECT '1.2: investment_offers Investor Offers policy check' as check_step;
SELECT 
    policyname,
    CASE 
        WHEN qual LIKE '%auth.uid()%' THEN '✅ Uses auth.uid()'
        ELSE '⚠️ Check auth method'
    END as auth_method,
    CASE 
        WHEN qual LIKE '%advisor_added_investors%' AND qual LIKE '%::text%' THEN '✅ Has type cast (VARCHAR = UUID)'
        WHEN qual LIKE '%advisor_added_investors%' THEN '⚠️ May need type cast'
        ELSE 'Other'
    END as type_cast_check,
    SUBSTRING(qual, 1, 200) as expression_preview
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'investment_offers'
AND cmd = 'SELECT'
AND qual LIKE '%Investment Advisor%'
AND qual LIKE '%investor%'
LIMIT 1;

-- 1.3: investment_offers - Startup Offers policy
SELECT '1.3: investment_offers Startup Offers policy check' as check_step;
SELECT 
    policyname,
    CASE 
        WHEN qual LIKE '%auth.uid()%' THEN '✅ Uses auth.uid()'
        ELSE '⚠️ Check auth method'
    END as auth_method,
    CASE 
        WHEN qual LIKE '%startups%' AND qual LIKE '%investment_advisor_code%' THEN '✅ Checks startup advisor code'
        ELSE 'Other'
    END as logic_check,
    SUBSTRING(qual, 1, 200) as expression_preview
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'investment_offers'
AND cmd = 'SELECT'
AND qual LIKE '%Investment Advisor%'
AND qual LIKE '%startup%'
LIMIT 1;

-- 1.4: co_investment_opportunities
SELECT '1.4: co_investment_opportunities policy check' as check_step;
SELECT 
    policyname,
    CASE 
        WHEN qual = 'true' THEN '✅ Public read (allows all)'
        WHEN qual LIKE '%auth.uid()%' THEN '✅ Uses auth.uid()'
        ELSE '⚠️ Check auth method'
    END as auth_method
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'co_investment_opportunities'
AND cmd = 'SELECT'
AND (qual LIKE '%Investment Advisor%' OR qual = 'true' OR qual LIKE '%Public%')
LIMIT 1;

-- 1.5: co_investment_offers
SELECT '1.5: co_investment_offers policy check' as check_step;
SELECT 
    policyname,
    CASE 
        WHEN qual LIKE '%auth.uid()%' THEN '✅ Uses auth.uid()'
        ELSE '⚠️ Check auth method'
    END as auth_method,
    CASE 
        WHEN qual LIKE '%investment_advisor_code_entered%' THEN '✅ Checks advisor code'
        ELSE 'Other'
    END as logic_check,
    SUBSTRING(qual, 1, 200) as expression_preview
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'co_investment_offers'
AND cmd = 'SELECT'
AND qual LIKE '%Investment Advisor%'
LIMIT 1;

-- =====================================================
-- STEP 2: Check Data Availability
-- =====================================================

SELECT '2.1: Data availability check' as check_step;
SELECT 
    'investment_offers (stages 1,2,4)' as table_name,
    COUNT(*) as total_records,
    COUNT(DISTINCT investor_email) as unique_investors,
    COUNT(DISTINCT startup_id) as unique_startups
FROM public.investment_offers
WHERE stage IN (1, 2, 4);

SELECT '2.2: Co-investment data availability' as check_step;
SELECT 
    'co_investment_opportunities (active)' as table_name,
    COUNT(*) as total_records
FROM public.co_investment_opportunities
WHERE status = 'active'
UNION ALL
SELECT 
    'co_investment_offers' as table_name,
    COUNT(*) as total_records
FROM public.co_investment_offers;

-- =====================================================
-- STEP 3: Check Advisor Code Matching
-- =====================================================
-- This checks if there's data that should match advisor codes

SELECT '3.1: Check advisor code matching potential' as check_step;
SELECT 
    'Investors with advisor codes' as check_type,
    COUNT(*) as total_investors_with_codes,
    COUNT(DISTINCT investment_advisor_code_entered) as unique_advisor_codes
FROM public.users
WHERE role = 'Investor'
AND investment_advisor_code_entered IS NOT NULL
AND investment_advisor_code_entered != '';

SELECT '3.2: Startups with advisor codes' as check_step;
SELECT 
    'Startups with advisor codes' as check_type,
    COUNT(*) as total_startups_with_codes,
    COUNT(DISTINCT investment_advisor_code) as unique_advisor_codes
FROM public.startups
WHERE investment_advisor_code IS NOT NULL
AND investment_advisor_code != '';

-- =====================================================
-- STEP 4: Common Issues Checklist
-- =====================================================

SELECT '4.1: Common Issues Checklist' as check_step;
SELECT 
    'Issue' as issue_type,
    'Check' as what_to_check,
    'Solution' as solution
FROM (VALUES
    ('RLS Policy uses wrong auth method', 'Check if policy uses auth.uid() not current_setting', 'Update policy to use auth.uid()'),
    ('Type mismatch (VARCHAR = UUID)', 'Check if advisor_added_investors.advisor_id needs ::text cast', 'Add ::text cast to both sides'),
    ('No matching data', 'Check if advisor codes match between users/startups and offers', 'Verify advisor_code values match'),
    ('Policy logic incorrect', 'Check if policy checks correct fields (investment_advisor_code vs investment_advisor_code_entered)', 'Update policy expression'),
    ('Frontend not using auth.uid()', 'Check if frontend queries use auth.uid() or currentUser.id', 'Update frontend to use auth.uid()')
) AS t(issue_type, what_to_check, solution);

-- =====================================================
-- STEP 5: Recommendations
-- =====================================================

SELECT '5.1: Recommendations' as check_step;
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_policies
            WHERE schemaname = 'public'
            AND tablename = 'investment_offers'
            AND qual LIKE '%Investment Advisor%'
            AND qual NOT LIKE '%auth.uid()%'
        ) THEN '⚠️ Update investment_offers policies to use auth.uid()'
        ELSE '✅ Policies use auth.uid()'
    END as recommendation_1,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_policies
            WHERE schemaname = 'public'
            AND tablename = 'investment_offers'
            AND qual LIKE '%advisor_added_investors%'
            AND qual NOT LIKE '%::text%'
        ) THEN '⚠️ Add ::text cast for advisor_added_investors.advisor_id'
        ELSE '✅ Type casts are correct'
    END as recommendation_2,
    CASE 
        WHEN (
            SELECT COUNT(*) FROM public.investment_offers WHERE stage IN (1, 2, 4)
        ) = 0 THEN '⚠️ No data in investment_offers table (stages 1,2,4)'
        ELSE '✅ Data exists in investment_offers'
    END as recommendation_3;




