-- =====================================================
-- CHECK ALL TABLES USED BY INVESTMENT ADVISOR DASHBOARD
-- =====================================================
-- Verify RLS policies for all tables used in:
-- 1. Service Requests
-- 2. Investor Offers
-- 3. Startup Offers
-- 4. Co-Investment Opportunities
-- =====================================================

-- Step 1: Check advisor_connection_requests (Service Requests)
SELECT 'Step 1: advisor_connection_requests RLS Policies' as info;
SELECT 
    policyname,
    cmd,
    CASE 
        WHEN qual LIKE '%Investment Advisor%' OR qual LIKE '%investment_advisor%' OR qual LIKE '%advisor_id%' THEN '✅ Investment Advisor Policy'
        WHEN qual LIKE '%Admin%' THEN '✅ Admin Policy'
        ELSE 'Other Policy'
    END as policy_type
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'advisor_connection_requests'
ORDER BY policyname;

-- Step 2: Check investment_offers (Investor Offers & Startup Offers)
SELECT 'Step 2: investment_offers RLS Policies' as info;
SELECT 
    policyname,
    cmd,
    CASE 
        WHEN qual LIKE '%Investment Advisor%' OR qual LIKE '%investment_advisor%' THEN '✅ Investment Advisor Policy'
        WHEN qual LIKE '%Startup%' OR qual LIKE '%startup%' THEN '✅ Startup Policy'
        WHEN qual LIKE '%Investor%' OR qual LIKE '%investor%' THEN '✅ Investor Policy'
        WHEN qual LIKE '%Admin%' THEN '✅ Admin Policy'
        ELSE 'Other Policy'
    END as policy_type
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'investment_offers'
ORDER BY policyname;

-- Step 3: Check co_investment_opportunities (Co-Investment Opportunities)
SELECT 'Step 3: co_investment_opportunities RLS Policies' as info;
SELECT 
    policyname,
    cmd,
    CASE 
        WHEN qual LIKE '%Investment Advisor%' OR qual LIKE '%investment_advisor%' THEN '✅ Investment Advisor Policy'
        WHEN qual LIKE '%Startup%' OR qual LIKE '%startup%' THEN '✅ Startup Policy'
        WHEN qual LIKE '%Investor%' OR qual LIKE '%investor%' THEN '✅ Investor Policy'
        WHEN qual LIKE '%Admin%' THEN '✅ Admin Policy'
        WHEN qual LIKE '%Public%' OR qual = 'true' THEN '⚠️ Public Policy'
        ELSE 'Other Policy'
    END as policy_type
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'co_investment_opportunities'
ORDER BY policyname;

-- Step 4: Check co_investment_offers (Co-Investment Offers)
SELECT 'Step 4: co_investment_offers RLS Policies' as info;
SELECT 
    policyname,
    cmd,
    CASE 
        WHEN qual LIKE '%Investment Advisor%' OR qual LIKE '%investment_advisor%' THEN '✅ Investment Advisor Policy'
        WHEN qual LIKE '%Startup%' OR qual LIKE '%startup%' THEN '✅ Startup Policy'
        WHEN qual LIKE '%Investor%' OR qual LIKE '%investor%' THEN '✅ Investor Policy'
        WHEN qual LIKE '%Admin%' THEN '✅ Admin Policy'
        ELSE 'Other Policy'
    END as policy_type
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'co_investment_offers'
ORDER BY policyname;

-- Step 5: Check users table (for Service Requests - investors with advisor codes)
SELECT 'Step 5: users table RLS Policies (for Service Requests)' as info;
SELECT 
    policyname,
    cmd,
    CASE 
        WHEN qual LIKE '%Investment Advisor%' OR qual LIKE '%investment_advisor%' THEN '✅ Investment Advisor Policy'
        WHEN qual LIKE '%Admin%' THEN '✅ Admin Policy'
        WHEN qual LIKE '%Public%' OR qual = 'true' THEN '⚠️ Public Policy'
        ELSE 'Other Policy'
    END as policy_type
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'users'
AND (qual LIKE '%investment_advisor%' OR qual LIKE '%Investment Advisor%')
ORDER BY policyname;

-- Step 6: Check startups table (for Service Requests - startups with advisor codes)
SELECT 'Step 6: startups table RLS Policies (for Service Requests)' as info;
SELECT 
    policyname,
    cmd,
    CASE 
        WHEN qual LIKE '%Investment Advisor%' OR qual LIKE '%investment_advisor%' THEN '✅ Investment Advisor Policy'
        WHEN qual LIKE '%user_id%' OR qual LIKE '%auth.uid%' THEN '✅ User Policy'
        WHEN qual LIKE '%Admin%' THEN '✅ Admin Policy'
        WHEN qual LIKE '%Public%' OR qual = 'true' THEN '⚠️ Public Policy'
        ELSE 'Other Policy'
    END as policy_type
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'startups'
ORDER BY policyname;

-- Step 7: Summary - Check if all tables have RLS enabled
SELECT 
    'Step 7: RLS Status for All Tables' as info,
    tablename,
    rowsecurity as rls_enabled,
    CASE 
        WHEN tablename = 'advisor_connection_requests' THEN 'Service Requests'
        WHEN tablename = 'investment_offers' THEN 'Investor/Startup Offers'
        WHEN tablename = 'co_investment_opportunities' THEN 'Co-Investment Opportunities'
        WHEN tablename = 'co_investment_offers' THEN 'Co-Investment Offers'
        WHEN tablename = 'users' THEN 'Users (Service Requests)'
        WHEN tablename = 'startups' THEN 'Startups (Service Requests)'
        ELSE 'Other'
    END as dashboard_section
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN (
    'advisor_connection_requests',
    'investment_offers',
    'co_investment_opportunities',
    'co_investment_offers',
    'users',
    'startups'
)
ORDER BY tablename;

-- Step 8: Final Verification - Count policies per table
SELECT 
    'Step 8: Policy Count Summary' as info,
    tablename,
    COUNT(*) as total_policies,
    COUNT(CASE WHEN cmd = 'SELECT' THEN 1 END) as select_policies,
    COUNT(CASE WHEN qual LIKE '%Investment Advisor%' OR qual LIKE '%investment_advisor%' THEN 1 END) as advisor_policies
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN (
    'advisor_connection_requests',
    'investment_offers',
    'co_investment_opportunities',
    'co_investment_offers'
)
GROUP BY tablename
ORDER BY tablename;




