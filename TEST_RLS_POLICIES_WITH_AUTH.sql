-- =====================================================
-- TEST RLS POLICIES WITH AUTH CONTEXT
-- =====================================================
-- Since all policies exist, test if they work correctly
-- This simulates what the frontend queries do
-- =====================================================

-- Note: This script shows what queries the frontend makes
-- You need to run these as an Investment Advisor user to test

-- =====================================================
-- TEST 1: Service Requests - advisor_connection_requests
-- =====================================================
-- Frontend query: SELECT * FROM advisor_connection_requests WHERE advisor_id = auth.uid()
-- RLS should filter automatically

SELECT 'Test 1: advisor_connection_requests' as test_name;
SELECT 
    'Expected: Investment Advisor can see their connection requests' as expected,
    'Query: SELECT * FROM advisor_connection_requests' as query,
    'RLS Policy should filter by advisor_id = auth.uid()' as rls_behavior;

-- =====================================================
-- TEST 2: Service Requests - users table
-- =====================================================
-- Frontend query: SELECT * FROM users WHERE investment_advisor_code_entered = 'IA-XXXXX' AND role = 'Investor'
-- RLS should allow Investment Advisors to read users

SELECT 'Test 2: users table (for Service Requests)' as test_name;
SELECT 
    'Expected: Investment Advisor can see users (investors with their code)' as expected,
    'Query: SELECT * FROM users WHERE investment_advisor_code_entered = advisor_code' as query,
    'RLS Policy should allow Investment Advisors to read users' as rls_behavior;

-- =====================================================
-- TEST 3: Service Requests - startups table
-- =====================================================
-- Frontend query: SELECT * FROM startups (filtered client-side by investment_advisor_code)
-- RLS should allow Investment Advisors to read startups

SELECT 'Test 3: startups table (for Service Requests)' as test_name;
SELECT 
    'Expected: Investment Advisor can see startups' as expected,
    'Query: SELECT * FROM startups' as query,
    'RLS Policy should allow Investment Advisors to read startups' as rls_behavior;

-- =====================================================
-- TEST 4: Investor Offers - investment_offers
-- =====================================================
-- Frontend query: SELECT * FROM investment_offers WHERE stage IN (1, 2, 4)
-- RLS should filter to show only offers from advisor's investors

SELECT 'Test 4: investment_offers (Investor Offers)' as test_name;
SELECT 
    'Expected: Investment Advisor can see offers from their investors' as expected,
    'Query: SELECT * FROM investment_offers WHERE stage IN (1, 2, 4)' as query,
    'RLS Policy should filter by investor_email matching advisor clients' as rls_behavior;

-- =====================================================
-- TEST 5: Startup Offers - investment_offers
-- =====================================================
-- Frontend query: SELECT * FROM investment_offers WHERE stage IN (1, 2, 4)
-- RLS should filter to show only offers for advisor's startups

SELECT 'Test 5: investment_offers (Startup Offers)' as test_name;
SELECT 
    'Expected: Investment Advisor can see offers for their startups' as expected,
    'Query: SELECT * FROM investment_offers WHERE stage IN (1, 2, 4)' as query,
    'RLS Policy should filter by startup_id matching advisor startups' as rls_behavior;

-- =====================================================
-- TEST 6: Co-Investment Opportunities
-- =====================================================
-- Frontend query: SELECT * FROM co_investment_opportunities WHERE status = 'active'
-- RLS should allow Investment Advisors to see all opportunities

SELECT 'Test 6: co_investment_opportunities' as test_name;
SELECT 
    'Expected: Investment Advisor can see all co-investment opportunities' as expected,
    'Query: SELECT * FROM co_investment_opportunities WHERE status = active' as query,
    'RLS Policy should allow Investment Advisors to read all' as rls_behavior;

-- =====================================================
-- TEST 7: Co-Investment Offers
-- =====================================================
-- Frontend query: SELECT * FROM co_investment_offers
-- RLS should filter to show only offers from advisor's clients

SELECT 'Test 7: co_investment_offers' as test_name;
SELECT 
    'Expected: Investment Advisor can see offers from their clients' as expected,
    'Query: SELECT * FROM co_investment_offers' as query,
    'RLS Policy should filter by investor_email matching advisor clients' as rls_behavior;

-- =====================================================
-- DIAGNOSTIC: Check if data exists
-- =====================================================

SELECT 'DIAGNOSTIC: Data Availability' as diagnostic;
SELECT 
    'advisor_connection_requests' as table_name,
    COUNT(*) as total_records
FROM public.advisor_connection_requests
UNION ALL
SELECT 
    'investment_offers (stages 1,2,4)' as table_name,
    COUNT(*) as total_records
FROM public.investment_offers
WHERE stage IN (1, 2, 4)
UNION ALL
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
-- RECOMMENDATIONS
-- =====================================================

SELECT 'RECOMMENDATIONS' as section;
SELECT 
    'If data exists but not showing in frontend:' as issue,
    '1. Check browser console for RLS errors (42501, PGRST301)' as step1,
    '2. Verify user is authenticated and role is Investment Advisor' as step2,
    '3. Check if advisor_code matches in database' as step3,
    '4. Verify policy expressions use auth.uid() correctly' as step4;




