-- =====================================================
-- TEST ALL INVESTMENT ADVISOR DASHBOARD SECTIONS
-- =====================================================
-- This script tests if Investment Advisors can access data for:
-- 1. Service Requests
-- 2. Investor Offers
-- 3. Startup Offers
-- 4. Co-Investment Opportunities
-- =====================================================

-- Step 1: Test Service Requests - advisor_connection_requests
SELECT 'Step 1: Testing Service Requests (advisor_connection_requests)' as test_section;
SELECT 
    COUNT(*) as total_requests,
    COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_requests,
    COUNT(CASE WHEN requester_type = 'Startup' THEN 1 END) as startup_requests,
    COUNT(CASE WHEN requester_type = 'Investor' THEN 1 END) as investor_requests
FROM public.advisor_connection_requests
WHERE advisor_id IN (
    SELECT id FROM public.users WHERE role = 'Investment Advisor' LIMIT 1
);

-- Step 2: Test Service Requests - Users with advisor codes (for manual code entry)
SELECT 'Step 2: Testing Service Requests (users with advisor codes)' as test_section;
SELECT 
    COUNT(*) as total_investors_with_codes,
    COUNT(DISTINCT investment_advisor_code_entered) as unique_advisor_codes
FROM public.users
WHERE role = 'Investor'
AND investment_advisor_code_entered IS NOT NULL;

-- Step 3: Test Service Requests - Startups with advisor codes
SELECT 'Step 3: Testing Service Requests (startups with advisor codes)' as test_section;
SELECT 
    COUNT(*) as total_startups_with_codes,
    COUNT(DISTINCT investment_advisor_code) as unique_advisor_codes
FROM public.startups
WHERE investment_advisor_code IS NOT NULL;

-- Step 4: Test Investor Offers - investment_offers (Stage 1 & 4)
SELECT 'Step 4: Testing Investor Offers (investment_offers)' as test_section;
SELECT 
    COUNT(*) as total_offers,
    COUNT(CASE WHEN stage IN (1, 4) THEN 1 END) as offers_at_stages_1_4,
    COUNT(DISTINCT investor_email) as unique_investors,
    COUNT(DISTINCT startup_id) as unique_startups
FROM public.investment_offers
WHERE stage IN (1, 2, 4);

-- Step 5: Test Startup Offers - investment_offers (Stage 2 & 4)
SELECT 'Step 5: Testing Startup Offers (investment_offers)' as test_section;
SELECT 
    COUNT(*) as total_offers,
    COUNT(CASE WHEN stage IN (2, 4) THEN 1 END) as offers_at_stages_2_4,
    COUNT(DISTINCT startup_id) as unique_startups
FROM public.investment_offers
WHERE stage IN (1, 2, 4);

-- Step 6: Test Co-Investment Opportunities - co_investment_opportunities
SELECT 'Step 6: Testing Co-Investment Opportunities' as test_section;
SELECT 
    COUNT(*) as total_opportunities,
    COUNT(CASE WHEN status = 'active' THEN 1 END) as active_opportunities,
    COUNT(CASE WHEN stage = 1 THEN 1 END) as stage_1_opportunities,
    COUNT(CASE WHEN stage = 2 THEN 1 END) as stage_2_opportunities,
    COUNT(DISTINCT startup_id) as unique_startups,
    COUNT(DISTINCT listed_by_user_id) as unique_listers
FROM public.co_investment_opportunities;

-- Step 7: Test Co-Investment Offers - co_investment_offers
SELECT 'Step 7: Testing Co-Investment Offers' as test_section;
SELECT 
    COUNT(*) as total_co_offers,
    COUNT(DISTINCT investor_email) as unique_investors,
    COUNT(DISTINCT startup_id) as unique_startups,
    COUNT(DISTINCT co_investment_opportunity_id) as unique_opportunities
FROM public.co_investment_offers;

-- Step 8: Sample Data Check - Verify data exists for testing
SELECT 'Step 8: Sample Data Check' as test_section;
SELECT 
    'advisor_connection_requests' as table_name,
    COUNT(*) as record_count
FROM public.advisor_connection_requests
UNION ALL
SELECT 
    'investment_offers' as table_name,
    COUNT(*) as record_count
FROM public.investment_offers
UNION ALL
SELECT 
    'co_investment_opportunities' as table_name,
    COUNT(*) as record_count
FROM public.co_investment_opportunities
UNION ALL
SELECT 
    'co_investment_offers' as table_name,
    COUNT(*) as record_count
FROM public.co_investment_offers;

-- Step 9: RLS Policy Summary
SELECT 'Step 9: RLS Policy Summary' as test_section;
SELECT 
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

-- Step 10: Final Status Check
SELECT 
    'Final Status' as check_type,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_policies
            WHERE schemaname = 'public'
            AND tablename = 'advisor_connection_requests'
            AND qual LIKE '%Investment Advisor%'
        ) THEN '✅ Service Requests RLS configured'
        ELSE '⚠️ Service Requests RLS may be missing'
    END as service_requests_status,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_policies
            WHERE schemaname = 'public'
            AND tablename = 'investment_offers'
            AND qual LIKE '%Investment Advisor%'
        ) THEN '✅ Investor/Startup Offers RLS configured'
        ELSE '⚠️ Offers RLS may be missing'
    END as offers_status,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_policies
            WHERE schemaname = 'public'
            AND tablename = 'co_investment_opportunities'
            AND qual LIKE '%Investment Advisor%'
        ) THEN '✅ Co-Investment Opportunities RLS configured'
        ELSE '⚠️ Co-Investment Opportunities RLS may be missing'
    END as co_opportunities_status,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_policies
            WHERE schemaname = 'public'
            AND tablename = 'co_investment_offers'
            AND qual LIKE '%Investment Advisor%'
        ) THEN '✅ Co-Investment Offers RLS configured'
        ELSE '⚠️ Co-Investment Offers RLS may be missing'
    END as co_offers_status;




