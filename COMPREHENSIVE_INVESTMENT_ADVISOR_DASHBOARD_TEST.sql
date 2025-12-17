-- =====================================================
-- COMPREHENSIVE TEST FOR INVESTMENT ADVISOR DASHBOARD
-- =====================================================
-- Tests all 4 sections:
-- 1. Service Requests
-- 2. Investor Offers
-- 3. Startup Offers
-- 4. Co-Investment Opportunities
-- =====================================================

-- =====================================================
-- SECTION 1: SERVICE REQUESTS
-- =====================================================

-- Test 1.1: advisor_connection_requests table
SELECT 'Test 1.1: advisor_connection_requests RLS' as test_name;
SELECT 
    CASE 
        WHEN COUNT(CASE WHEN qual LIKE '%Investment Advisor%' OR qual LIKE '%advisor_id%' THEN 1 END) > 0 
        THEN '✅ Investment Advisors can view connection requests'
        ELSE '❌ Investment Advisors CANNOT view connection requests'
    END as status
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'advisor_connection_requests'
AND cmd = 'SELECT';

-- Test 1.2: users table (for investors with advisor codes)
SELECT 'Test 1.2: users table RLS (for Service Requests)' as test_name;
SELECT 
    CASE 
        WHEN COUNT(CASE 
            WHEN qual LIKE '%Investment Advisor%' 
            OR qual LIKE '%investment_advisor%' 
            OR qual = 'true' 
            OR qual LIKE '%Public%'
            THEN 1 
        END) > 0 
        THEN '✅ Investment Advisors can view users'
        ELSE '❌ Investment Advisors CANNOT view users (Service Requests will fail)'
    END as status
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'users'
AND cmd = 'SELECT';

-- Test 1.3: startups table (for startups with advisor codes)
SELECT 'Test 1.3: startups table RLS (for Service Requests)' as test_name;
SELECT 
    CASE 
        WHEN COUNT(CASE 
            WHEN qual LIKE '%Investment Advisor%' 
            OR qual LIKE '%investment_advisor%' 
            OR qual = 'true' 
            OR qual LIKE '%Public%'
            THEN 1 
        END) > 0 
        THEN '✅ Investment Advisors can view startups'
        ELSE '❌ Investment Advisors CANNOT view startups (Service Requests will fail)'
    END as status
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'startups'
AND cmd = 'SELECT';

-- =====================================================
-- SECTION 2: INVESTOR OFFERS
-- =====================================================

-- Test 2.1: investment_offers table (for Investor Offers)
SELECT 'Test 2.1: investment_offers RLS (for Investor Offers)' as test_name;
SELECT 
    CASE 
        WHEN COUNT(CASE 
            WHEN qual LIKE '%Investment Advisor%' 
            OR qual LIKE '%investment_advisor%'
            OR qual LIKE '%advisor_added_investors%'
            THEN 1 
        END) > 0 
        THEN '✅ Investment Advisors can view offers from their investors'
        ELSE '❌ Investment Advisors CANNOT view offers from their investors'
    END as status
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'investment_offers'
AND cmd = 'SELECT';

-- =====================================================
-- SECTION 3: STARTUP OFFERS
-- =====================================================

-- Test 3.1: investment_offers table (for Startup Offers)
SELECT 'Test 3.1: investment_offers RLS (for Startup Offers)' as test_name;
SELECT 
    CASE 
        WHEN COUNT(CASE 
            WHEN qual LIKE '%Investment Advisor%' 
            OR qual LIKE '%investment_advisor_code%'
            OR qual LIKE '%startups%'
            THEN 1 
        END) > 0 
        THEN '✅ Investment Advisors can view offers for their startups'
        ELSE '❌ Investment Advisors CANNOT view offers for their startups'
    END as status
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'investment_offers'
AND cmd = 'SELECT';

-- =====================================================
-- SECTION 4: CO-INVESTMENT OPPORTUNITIES
-- =====================================================

-- Test 4.1: co_investment_opportunities table
SELECT 'Test 4.1: co_investment_opportunities RLS' as test_name;
SELECT 
    CASE 
        WHEN COUNT(CASE 
            WHEN qual LIKE '%Investment Advisor%' 
            OR qual LIKE '%investment_advisor%'
            OR qual = 'true'
            OR qual LIKE '%Public%'
            THEN 1 
        END) > 0 
        THEN '✅ Investment Advisors can view co-investment opportunities'
        ELSE '❌ Investment Advisors CANNOT view co-investment opportunities'
    END as status
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'co_investment_opportunities'
AND cmd = 'SELECT';

-- Test 4.2: co_investment_offers table
SELECT 'Test 4.2: co_investment_offers RLS' as test_name;
SELECT 
    CASE 
        WHEN COUNT(CASE 
            WHEN qual LIKE '%Investment Advisor%' 
            OR qual LIKE '%investment_advisor%'
            OR qual LIKE '%clients%'
            THEN 1 
        END) > 0 
        THEN '✅ Investment Advisors can view co-investment offers'
        ELSE '❌ Investment Advisors CANNOT view co-investment offers'
    END as status
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'co_investment_offers'
AND cmd = 'SELECT';

-- =====================================================
-- FINAL SUMMARY
-- =====================================================

SELECT 'FINAL SUMMARY' as summary_type;
SELECT 
    'Service Requests' as section,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_policies
            WHERE schemaname = 'public'
            AND tablename = 'advisor_connection_requests'
            AND qual LIKE '%Investment Advisor%'
        ) AND EXISTS (
            SELECT 1 FROM pg_policies
            WHERE schemaname = 'public'
            AND tablename = 'users'
            AND cmd = 'SELECT'
            AND (qual LIKE '%Investment Advisor%' OR qual = 'true' OR qual LIKE '%Public%')
        ) AND EXISTS (
            SELECT 1 FROM pg_policies
            WHERE schemaname = 'public'
            AND tablename = 'startups'
            AND cmd = 'SELECT'
            AND (qual LIKE '%Investment Advisor%' OR qual = 'true' OR qual LIKE '%Public%')
        )
        THEN '✅ Configured'
        ELSE '❌ Missing policies'
    END as status
UNION ALL
SELECT 
    'Investor Offers' as section,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_policies
            WHERE schemaname = 'public'
            AND tablename = 'investment_offers'
            AND qual LIKE '%Investment Advisor%'
            AND qual LIKE '%investor%'
        )
        THEN '✅ Configured'
        ELSE '❌ Missing policies'
    END as status
UNION ALL
SELECT 
    'Startup Offers' as section,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_policies
            WHERE schemaname = 'public'
            AND tablename = 'investment_offers'
            AND qual LIKE '%Investment Advisor%'
            AND qual LIKE '%startup%'
        )
        THEN '✅ Configured'
        ELSE '❌ Missing policies'
    END as status
UNION ALL
SELECT 
    'Co-Investment Opportunities' as section,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_policies
            WHERE schemaname = 'public'
            AND tablename = 'co_investment_opportunities'
            AND (qual LIKE '%Investment Advisor%' OR qual = 'true' OR qual LIKE '%Public%')
        ) AND EXISTS (
            SELECT 1 FROM pg_policies
            WHERE schemaname = 'public'
            AND tablename = 'co_investment_offers'
            AND qual LIKE '%Investment Advisor%'
        )
        THEN '✅ Configured'
        ELSE '❌ Missing policies'
    END as status;





