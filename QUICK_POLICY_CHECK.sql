-- =====================================================
-- QUICK POLICY CHECK FOR INVESTMENT ADVISOR DASHBOARD
-- =====================================================
-- Since RLS is enabled on all tables, check what policies exist
-- =====================================================

-- 1. Service Requests - advisor_connection_requests
SELECT '1. advisor_connection_requests policies' as section;
SELECT 
    policyname,
    cmd,
    CASE 
        WHEN qual LIKE '%Investment Advisor%' OR qual LIKE '%advisor_id%' THEN '✅ Has Investment Advisor policy'
        ELSE '❌ Missing Investment Advisor policy'
    END as status
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'advisor_connection_requests'
ORDER BY policyname;

-- 2. Service Requests - users table
SELECT '2. users table policies (SELECT)' as section;
SELECT 
    policyname,
    cmd,
    CASE 
        WHEN qual LIKE '%Investment Advisor%' OR qual LIKE '%investment_advisor%' THEN '✅ Has Investment Advisor policy'
        WHEN qual = 'true' OR qual LIKE '%Public%' THEN '✅ Has Public policy (allows all)'
        ELSE 'Other policy'
    END as status
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'users'
AND cmd = 'SELECT'
ORDER BY policyname;

-- 3. Service Requests - startups table
SELECT '3. startups table policies (SELECT)' as section;
SELECT 
    policyname,
    cmd,
    CASE 
        WHEN qual LIKE '%Investment Advisor%' OR qual LIKE '%investment_advisor%' THEN '✅ Has Investment Advisor policy'
        WHEN qual = 'true' OR qual LIKE '%Public%' THEN '✅ Has Public policy (allows all)'
        ELSE 'Other policy'
    END as status
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'startups'
AND cmd = 'SELECT'
ORDER BY policyname;

-- 4. Investor/Startup Offers - investment_offers
SELECT '4. investment_offers policies (SELECT)' as section;
SELECT 
    policyname,
    cmd,
    CASE 
        WHEN qual LIKE '%Investment Advisor%' AND qual LIKE '%investor%' THEN '✅ Has Investor Offers policy'
        WHEN qual LIKE '%Investment Advisor%' AND qual LIKE '%startup%' THEN '✅ Has Startup Offers policy'
        WHEN qual LIKE '%Investment Advisor%' THEN '✅ Has Investment Advisor policy'
        ELSE 'Other policy'
    END as status
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'investment_offers'
AND cmd = 'SELECT'
ORDER BY policyname;

-- 5. Co-Investment Opportunities - co_investment_opportunities
SELECT '5. co_investment_opportunities policies (SELECT)' as section;
SELECT 
    policyname,
    cmd,
    CASE 
        WHEN qual LIKE '%Investment Advisor%' OR qual LIKE '%investment_advisor%' THEN '✅ Has Investment Advisor policy'
        WHEN qual = 'true' OR qual LIKE '%Public%' THEN '✅ Has Public policy (allows all)'
        ELSE 'Other policy'
    END as status
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'co_investment_opportunities'
AND cmd = 'SELECT'
ORDER BY policyname;

-- 6. Co-Investment Offers - co_investment_offers
SELECT '6. co_investment_offers policies (SELECT)' as section;
SELECT 
    policyname,
    cmd,
    CASE 
        WHEN qual LIKE '%Investment Advisor%' OR qual LIKE '%investment_advisor%' THEN '✅ Has Investment Advisor policy'
        WHEN qual LIKE '%clients%' OR qual LIKE '%Clients%' THEN '✅ Has Clients policy'
        ELSE 'Other policy'
    END as status
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'co_investment_offers'
AND cmd = 'SELECT'
ORDER BY policyname;

-- =====================================================
-- SUMMARY: What's Missing?
-- =====================================================

SELECT 'SUMMARY: Missing Policies' as summary;
SELECT 
    'Service Requests - advisor_connection_requests' as table_name,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_policies
            WHERE schemaname = 'public'
            AND tablename = 'advisor_connection_requests'
            AND (qual LIKE '%Investment Advisor%' OR qual LIKE '%advisor_id%')
        ) THEN '✅ Has policy'
        ELSE '❌ MISSING'
    END as status
UNION ALL
SELECT 
    'Service Requests - users table' as table_name,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_policies
            WHERE schemaname = 'public'
            AND tablename = 'users'
            AND cmd = 'SELECT'
            AND (qual LIKE '%Investment Advisor%' OR qual = 'true' OR qual LIKE '%Public%')
        ) THEN '✅ Has policy'
        ELSE '❌ MISSING'
    END as status
UNION ALL
SELECT 
    'Service Requests - startups table' as table_name,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_policies
            WHERE schemaname = 'public'
            AND tablename = 'startups'
            AND cmd = 'SELECT'
            AND (qual LIKE '%Investment Advisor%' OR qual = 'true' OR qual LIKE '%Public%')
        ) THEN '✅ Has policy'
        ELSE '❌ MISSING'
    END as status
UNION ALL
SELECT 
    'Investor Offers - investment_offers' as table_name,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_policies
            WHERE schemaname = 'public'
            AND tablename = 'investment_offers'
            AND cmd = 'SELECT'
            AND qual LIKE '%Investment Advisor%'
            AND qual LIKE '%investor%'
        ) THEN '✅ Has policy'
        ELSE '⚠️ Check manually'
    END as status
UNION ALL
SELECT 
    'Startup Offers - investment_offers' as table_name,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_policies
            WHERE schemaname = 'public'
            AND tablename = 'investment_offers'
            AND cmd = 'SELECT'
            AND qual LIKE '%Investment Advisor%'
            AND qual LIKE '%startup%'
        ) THEN '✅ Has policy'
        ELSE '⚠️ Check manually'
    END as status
UNION ALL
SELECT 
    'Co-Investment Opportunities - co_investment_opportunities' as table_name,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_policies
            WHERE schemaname = 'public'
            AND tablename = 'co_investment_opportunities'
            AND cmd = 'SELECT'
            AND (qual LIKE '%Investment Advisor%' OR qual = 'true' OR qual LIKE '%Public%')
        ) THEN '✅ Has policy'
        ELSE '❌ MISSING'
    END as status
UNION ALL
SELECT 
    'Co-Investment Offers - co_investment_offers' as table_name,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_policies
            WHERE schemaname = 'public'
            AND tablename = 'co_investment_offers'
            AND cmd = 'SELECT'
            AND qual LIKE '%Investment Advisor%'
        ) THEN '✅ Has policy'
        ELSE '❌ MISSING'
    END as status;




