-- =====================================================
-- CHECK EXISTING RLS POLICIES FOR INVESTMENT ADVISOR DASHBOARD
-- =====================================================
-- Check what policies already exist before making changes
-- =====================================================

-- =====================================================
-- SECTION 1: SERVICE REQUESTS
-- =====================================================

-- 1.1: advisor_connection_requests
SELECT '1.1: advisor_connection_requests policies' as check_section;
SELECT 
    policyname,
    cmd,
    qual as policy_expression,
    CASE 
        WHEN qual LIKE '%Investment Advisor%' OR qual LIKE '%advisor_id%' THEN '✅ Has Investment Advisor policy'
        ELSE '❌ Missing Investment Advisor policy'
    END as status
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'advisor_connection_requests'
ORDER BY policyname;

-- 1.2: users table
SELECT '1.2: users table policies (for Service Requests)' as check_section;
SELECT 
    policyname,
    cmd,
    CASE 
        WHEN qual LIKE '%Investment Advisor%' OR qual LIKE '%investment_advisor%' THEN '✅ Has Investment Advisor policy'
        WHEN qual = 'true' OR qual LIKE '%Public%' THEN '✅ Has Public policy (allows all)'
        ELSE 'Other policy'
    END as policy_type,
    qual as policy_expression
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'users'
AND cmd = 'SELECT'
ORDER BY policyname;

-- 1.3: startups table
SELECT '1.3: startups table policies (for Service Requests)' as check_section;
SELECT 
    policyname,
    cmd,
    CASE 
        WHEN qual LIKE '%Investment Advisor%' OR qual LIKE '%investment_advisor%' THEN '✅ Has Investment Advisor policy'
        WHEN qual = 'true' OR qual LIKE '%Public%' THEN '✅ Has Public policy (allows all)'
        ELSE 'Other policy'
    END as policy_type,
    qual as policy_expression
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'startups'
AND cmd = 'SELECT'
ORDER BY policyname;

-- =====================================================
-- SECTION 2: INVESTOR OFFERS
-- =====================================================

SELECT '2.1: investment_offers policies (for Investor Offers)' as check_section;
SELECT 
    policyname,
    cmd,
    CASE 
        WHEN qual LIKE '%Investment Advisor%' OR qual LIKE '%investment_advisor%' THEN '✅ Has Investment Advisor policy'
        WHEN qual LIKE '%investor%' OR qual LIKE '%Investor%' THEN '✅ Has Investor policy'
        ELSE 'Other policy'
    END as policy_type,
    qual as policy_expression
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'investment_offers'
AND cmd = 'SELECT'
ORDER BY policyname;

-- =====================================================
-- SECTION 3: STARTUP OFFERS
-- =====================================================

SELECT '3.1: investment_offers policies (for Startup Offers)' as check_section;
SELECT 
    policyname,
    cmd,
    CASE 
        WHEN qual LIKE '%Investment Advisor%' OR qual LIKE '%investment_advisor%' THEN '✅ Has Investment Advisor policy'
        WHEN qual LIKE '%startup%' OR qual LIKE '%Startup%' THEN '✅ Has Startup policy'
        ELSE 'Other policy'
    END as policy_type,
    qual as policy_expression
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'investment_offers'
AND cmd = 'SELECT'
ORDER BY policyname;

-- =====================================================
-- SECTION 4: CO-INVESTMENT OPPORTUNITIES
-- =====================================================

-- 4.1: co_investment_opportunities
SELECT '4.1: co_investment_opportunities policies' as check_section;
SELECT 
    policyname,
    cmd,
    CASE 
        WHEN qual LIKE '%Investment Advisor%' OR qual LIKE '%investment_advisor%' THEN '✅ Has Investment Advisor policy'
        WHEN qual = 'true' OR qual LIKE '%Public%' THEN '✅ Has Public policy (allows all)'
        ELSE 'Other policy'
    END as policy_type,
    qual as policy_expression
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'co_investment_opportunities'
AND cmd = 'SELECT'
ORDER BY policyname;

-- 4.2: co_investment_offers
SELECT '4.2: co_investment_offers policies' as check_section;
SELECT 
    policyname,
    cmd,
    CASE 
        WHEN qual LIKE '%Investment Advisor%' OR qual LIKE '%investment_advisor%' THEN '✅ Has Investment Advisor policy'
        WHEN qual LIKE '%clients%' OR qual LIKE '%Clients%' THEN '✅ Has Clients policy'
        ELSE 'Other policy'
    END as policy_type,
    qual as policy_expression
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'co_investment_offers'
AND cmd = 'SELECT'
ORDER BY policyname;

-- =====================================================
-- SUMMARY: What's Missing?
-- =====================================================

SELECT 'SUMMARY: Missing Policies' as summary_section;
SELECT 
    'Service Requests - advisor_connection_requests' as table_name,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_policies
            WHERE schemaname = 'public'
            AND tablename = 'advisor_connection_requests'
            AND (qual LIKE '%Investment Advisor%' OR qual LIKE '%advisor_id%')
        ) THEN '✅ Has policy'
        ELSE '❌ MISSING - Needs Investment Advisor policy'
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
        ELSE '❌ MISSING - Needs Investment Advisor or Public policy'
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
        ELSE '❌ MISSING - Needs Investment Advisor or Public policy'
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
        ELSE '⚠️ Check if policy exists (may use different qualifier)'
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
        ELSE '⚠️ Check if policy exists (may use different qualifier)'
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
        ELSE '❌ MISSING - Needs Investment Advisor or Public policy'
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
        ELSE '❌ MISSING - Needs Investment Advisor policy'
    END as status;

-- =====================================================
-- RLS ENABLED STATUS
-- =====================================================

SELECT 'RLS Enabled Status' as check_section;
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
    'advisor_connection_requests',
    'users',
    'startups',
    'investment_offers',
    'co_investment_opportunities',
    'co_investment_offers'
)
ORDER BY tablename;


