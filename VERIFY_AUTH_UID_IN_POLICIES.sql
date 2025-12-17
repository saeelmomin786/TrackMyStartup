-- =====================================================
-- VERIFY ALL POLICIES USE auth.uid() CORRECTLY
-- =====================================================
-- Check actual policy expressions to ensure they use auth.uid()
-- =====================================================

-- =====================================================
-- 1. advisor_connection_requests
-- =====================================================

SELECT '1. advisor_connection_requests policies' as section;
SELECT 
    policyname,
    cmd,
    CASE 
        WHEN qual LIKE '%auth.uid()%' THEN '✅ Uses auth.uid()'
        WHEN qual LIKE '%current_setting%' THEN '❌ Uses current_setting (WRONG - needs fix)'
        WHEN qual LIKE '%app.current_user_id%' THEN '❌ Uses app.current_user_id (WRONG - needs fix)'
        ELSE '⚠️ Check manually'
    END as auth_method_status,
    qual as full_expression
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'advisor_connection_requests'
AND (qual LIKE '%Investment Advisor%' OR qual LIKE '%advisor_id%')
ORDER BY policyname;

-- =====================================================
-- 2. users table (for Service Requests)
-- =====================================================

SELECT '2. users table policies (SELECT)' as section;
SELECT 
    policyname,
    cmd,
    CASE 
        WHEN qual = 'true' THEN '✅ Public read (allows all - OK)'
        WHEN qual LIKE '%Public%' THEN '✅ Public policy (OK)'
        WHEN qual LIKE '%auth.uid()%' AND qual LIKE '%Investment Advisor%' THEN '✅ Uses auth.uid() with Investment Advisor check'
        WHEN qual LIKE '%Investment Advisor%' AND qual NOT LIKE '%auth.uid()%' THEN '❌ Investment Advisor policy missing auth.uid()'
        ELSE 'Other policy'
    END as auth_method_status,
    CASE 
        WHEN qual = 'true' THEN 'Public read - no expression needed'
        ELSE SUBSTRING(qual, 1, 300) 
    END as expression_preview
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'users'
AND cmd = 'SELECT'
AND (qual LIKE '%Investment Advisor%' OR qual = 'true' OR qual LIKE '%Public%')
ORDER BY policyname;

-- =====================================================
-- 3. startups table (for Service Requests)
-- =====================================================

SELECT '3. startups table policies (SELECT)' as section;
SELECT 
    policyname,
    cmd,
    CASE 
        WHEN qual = 'true' THEN '✅ Public read (allows all - OK)'
        WHEN qual LIKE '%Public%' THEN '✅ Public policy (OK)'
        WHEN qual LIKE '%auth.uid()%' AND qual LIKE '%Investment Advisor%' THEN '✅ Uses auth.uid() with Investment Advisor check'
        WHEN qual LIKE '%Investment Advisor%' AND qual NOT LIKE '%auth.uid()%' THEN '❌ Investment Advisor policy missing auth.uid()'
        ELSE 'Other policy'
    END as auth_method_status,
    CASE 
        WHEN qual = 'true' THEN 'Public read - no expression needed'
        ELSE SUBSTRING(qual, 1, 300) 
    END as expression_preview
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'startups'
AND cmd = 'SELECT'
AND (qual LIKE '%Investment Advisor%' OR qual = 'true' OR qual LIKE '%Public%')
ORDER BY policyname;

-- =====================================================
-- 4. investment_offers - Investor Offers
-- =====================================================

SELECT '4. investment_offers - Investor Offers policies' as section;
SELECT 
    policyname,
    cmd,
    CASE 
        WHEN qual LIKE '%auth.uid()%' THEN '✅ Uses auth.uid()'
        WHEN qual LIKE '%current_setting%' THEN '❌ Uses current_setting (WRONG - needs fix)'
        ELSE '⚠️ Check manually'
    END as auth_method_status,
    CASE 
        WHEN qual LIKE '%::text%' AND qual LIKE '%advisor_added_investors%' THEN '✅ Has type cast for VARCHAR = UUID'
        WHEN qual LIKE '%advisor_added_investors%' AND qual NOT LIKE '%::text%' THEN '⚠️ May need type cast'
        ELSE 'Other'
    END as type_cast_status,
    SUBSTRING(qual, 1, 400) as expression_preview
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'investment_offers'
AND cmd = 'SELECT'
AND qual LIKE '%Investment Advisor%'
AND qual LIKE '%investor%'
ORDER BY policyname;

-- =====================================================
-- 5. investment_offers - Startup Offers
-- =====================================================

SELECT '5. investment_offers - Startup Offers policies' as section;
SELECT 
    policyname,
    cmd,
    CASE 
        WHEN qual LIKE '%auth.uid()%' THEN '✅ Uses auth.uid()'
        WHEN qual LIKE '%current_setting%' THEN '❌ Uses current_setting (WRONG - needs fix)'
        ELSE '⚠️ Check manually'
    END as auth_method_status,
    SUBSTRING(qual, 1, 400) as expression_preview
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'investment_offers'
AND cmd = 'SELECT'
AND qual LIKE '%Investment Advisor%'
AND qual LIKE '%startup%'
ORDER BY policyname;

-- =====================================================
-- 6. co_investment_opportunities
-- =====================================================

SELECT '6. co_investment_opportunities policies' as section;
SELECT 
    policyname,
    cmd,
    CASE 
        WHEN qual = 'true' THEN '✅ Public read (allows all - OK)'
        WHEN qual LIKE '%Public%' THEN '✅ Public policy (OK)'
        WHEN qual LIKE '%auth.uid()%' AND qual LIKE '%Investment Advisor%' THEN '✅ Uses auth.uid() with Investment Advisor check'
        WHEN qual LIKE '%Investment Advisor%' AND qual NOT LIKE '%auth.uid()%' THEN '❌ Investment Advisor policy missing auth.uid()'
        WHEN qual LIKE '%current_setting%' THEN '❌ Uses current_setting (WRONG - needs fix)'
        ELSE 'Other'
    END as auth_method_status,
    CASE 
        WHEN qual = 'true' THEN 'Public read - no expression needed'
        ELSE SUBSTRING(qual, 1, 300) 
    END as expression_preview
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'co_investment_opportunities'
AND cmd = 'SELECT'
AND (qual LIKE '%Investment Advisor%' OR qual = 'true' OR qual LIKE '%Public%')
ORDER BY policyname;

-- =====================================================
-- 7. co_investment_offers
-- =====================================================

SELECT '7. co_investment_offers Investment Advisor policies' as section;
SELECT 
    policyname,
    cmd,
    CASE 
        WHEN qual LIKE '%auth.uid()%' THEN '✅ Uses auth.uid()'
        WHEN qual LIKE '%current_setting%' THEN '❌ Uses current_setting (WRONG - needs fix)'
        ELSE '⚠️ Check manually'
    END as auth_method_status,
    SUBSTRING(qual, 1, 400) as expression_preview
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'co_investment_offers'
AND cmd = 'SELECT'
AND qual LIKE '%Investment Advisor%'
ORDER BY policyname;

-- =====================================================
-- SUMMARY: Issues Found
-- =====================================================

SELECT 'SUMMARY: Policy Expression Issues' as summary_section;
SELECT 
    'advisor_connection_requests' as table_name,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_policies
            WHERE schemaname = 'public'
            AND tablename = 'advisor_connection_requests'
            AND qual LIKE '%auth.uid()%'
        ) THEN '✅ OK'
        WHEN EXISTS (
            SELECT 1 FROM pg_policies
            WHERE schemaname = 'public'
            AND tablename = 'advisor_connection_requests'
            AND qual LIKE '%current_setting%'
        ) THEN '❌ NEEDS FIX - Uses current_setting'
        ELSE '⚠️ Check manually'
    END as status
UNION ALL
SELECT 
    'investment_offers (Investor Offers)' as table_name,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_policies
            WHERE schemaname = 'public'
            AND tablename = 'investment_offers'
            AND qual LIKE '%auth.uid()%'
            AND qual LIKE '%Investment Advisor%'
            AND qual LIKE '%investor%'
        ) THEN '✅ OK'
        WHEN EXISTS (
            SELECT 1 FROM pg_policies
            WHERE schemaname = 'public'
            AND tablename = 'investment_offers'
            AND qual LIKE '%current_setting%'
            AND qual LIKE '%Investment Advisor%'
        ) THEN '❌ NEEDS FIX - Uses current_setting'
        ELSE '⚠️ Check manually'
    END as status
UNION ALL
SELECT 
    'investment_offers (Startup Offers)' as table_name,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_policies
            WHERE schemaname = 'public'
            AND tablename = 'investment_offers'
            AND qual LIKE '%auth.uid()%'
            AND qual LIKE '%Investment Advisor%'
            AND qual LIKE '%startup%'
        ) THEN '✅ OK'
        WHEN EXISTS (
            SELECT 1 FROM pg_policies
            WHERE schemaname = 'public'
            AND tablename = 'investment_offers'
            AND qual LIKE '%current_setting%'
            AND qual LIKE '%Investment Advisor%'
        ) THEN '❌ NEEDS FIX - Uses current_setting'
        ELSE '⚠️ Check manually'
    END as status
UNION ALL
SELECT 
    'co_investment_opportunities' as table_name,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_policies
            WHERE schemaname = 'public'
            AND tablename = 'co_investment_opportunities'
            AND cmd = 'SELECT'
            AND (qual = 'true' OR qual LIKE '%Public%' OR (qual LIKE '%auth.uid()%' AND qual LIKE '%Investment Advisor%'))
        ) THEN '✅ OK'
        WHEN EXISTS (
            SELECT 1 FROM pg_policies
            WHERE schemaname = 'public'
            AND tablename = 'co_investment_opportunities'
            AND qual LIKE '%current_setting%'
        ) THEN '❌ NEEDS FIX - Uses current_setting'
        ELSE '⚠️ Check manually'
    END as status
UNION ALL
SELECT 
    'co_investment_offers' as table_name,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_policies
            WHERE schemaname = 'public'
            AND tablename = 'co_investment_offers'
            AND qual LIKE '%auth.uid()%'
            AND qual LIKE '%Investment Advisor%'
        ) THEN '✅ OK'
        WHEN EXISTS (
            SELECT 1 FROM pg_policies
            WHERE schemaname = 'public'
            AND tablename = 'co_investment_offers'
            AND qual LIKE '%current_setting%'
        ) THEN '❌ NEEDS FIX - Uses current_setting'
        ELSE '⚠️ Check manually'
    END as status;

-- =====================================================
-- FINAL RECOMMENDATION
-- =====================================================

SELECT 'FINAL RECOMMENDATION' as final_check;
SELECT 
    CASE 
        WHEN NOT EXISTS (
            SELECT 1 FROM pg_policies
            WHERE schemaname = 'public'
            AND (
                (tablename = 'advisor_connection_requests' AND qual LIKE '%current_setting%')
                OR (tablename = 'investment_offers' AND qual LIKE '%current_setting%' AND qual LIKE '%Investment Advisor%')
                OR (tablename = 'co_investment_opportunities' AND qual LIKE '%current_setting%')
                OR (tablename = 'co_investment_offers' AND qual LIKE '%current_setting%')
            )
        ) THEN '✅ All policies use auth.uid() correctly - No fixes needed'
        ELSE '❌ Some policies use current_setting - Need to update to auth.uid()'
    END as overall_status;


