-- =====================================================
-- FIX ALL RLS POLICIES FOR INVESTMENT ADVISOR DASHBOARD
-- =====================================================
-- This script ensures all tables used in Investment Advisor Dashboard
-- have proper RLS policies for:
-- 1. Service Requests (advisor_connection_requests, users, startups)
-- 2. Investor Offers (investment_offers)
-- 3. Startup Offers (investment_offers)
-- 4. Co-Investment Opportunities (co_investment_opportunities, co_investment_offers)
-- =====================================================

-- =====================================================
-- 1. SERVICE REQUESTS - advisor_connection_requests
-- =====================================================

-- Check current policies
SELECT 'Step 1: Current advisor_connection_requests policies' as info;
SELECT policyname, cmd FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'advisor_connection_requests';

-- Enable RLS
ALTER TABLE public.advisor_connection_requests ENABLE ROW LEVEL SECURITY;

-- Drop and recreate Investment Advisor policy
DROP POLICY IF EXISTS "Investment Advisors can view their connection requests" ON public.advisor_connection_requests;

CREATE POLICY "Investment Advisors can view their connection requests" 
ON public.advisor_connection_requests 
FOR SELECT 
TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM public.users advisor
        WHERE advisor.id = auth.uid()
        AND advisor.role = 'Investment Advisor'
        AND advisor_connection_requests.advisor_id = auth.uid()
    )
);

-- =====================================================
-- 2. INVESTOR OFFERS & STARTUP OFFERS - investment_offers
-- =====================================================
-- (Already fixed in previous script, but verify)

SELECT 'Step 2: Verifying investment_offers policies' as info;
SELECT policyname, cmd FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'investment_offers'
AND (policyname LIKE '%Investment Advisor%' OR policyname LIKE '%Startup%' OR policyname LIKE '%Investor%');

-- =====================================================
-- 3. CO-INVESTMENT OPPORTUNITIES - co_investment_opportunities
-- =====================================================

-- Check current policies
SELECT 'Step 3: Current co_investment_opportunities policies' as info;
SELECT policyname, cmd FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'co_investment_opportunities';

-- Enable RLS
ALTER TABLE public.co_investment_opportunities ENABLE ROW LEVEL SECURITY;

-- Drop existing Investment Advisor policies
DROP POLICY IF EXISTS "Investment Advisors can view all co-investment opportunities" ON public.co_investment_opportunities;
DROP POLICY IF EXISTS "Investment Advisors can view opportunities for their clients" ON public.co_investment_opportunities;

-- Create policy for Investment Advisors to view all active opportunities
CREATE POLICY "Investment Advisors can view all co-investment opportunities" 
ON public.co_investment_opportunities 
FOR SELECT 
TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM public.users advisor
        WHERE advisor.id = auth.uid()
        AND advisor.role = 'Investment Advisor'
    )
);

-- =====================================================
-- 4. CO-INVESTMENT OFFERS - co_investment_offers
-- =====================================================

-- Check current policies
SELECT 'Step 4: Current co_investment_offers policies' as info;
SELECT policyname, cmd FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'co_investment_offers';

-- Enable RLS
ALTER TABLE public.co_investment_offers ENABLE ROW LEVEL SECURITY;

-- Verify Investment Advisor policy exists (should already exist from CREATE_CO_INVESTMENT_OFFERS_TABLE.sql)
-- If not, create it
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
        AND tablename = 'co_investment_offers'
        AND policyname = 'Investment advisors can view offers for their clients'
    ) THEN
        CREATE POLICY "Investment advisors can view offers for their clients" 
        ON public.co_investment_offers 
        FOR SELECT 
        TO authenticated 
        USING (
            EXISTS (
                SELECT 1 FROM public.users investor
                JOIN public.users advisor ON advisor.id = auth.uid()
                WHERE investor.email = co_investment_offers.investor_email
                AND investor.investment_advisor_code_entered = advisor.investment_advisor_code
                AND advisor.role = 'Investment Advisor'
            )
        );
    END IF;
END $$;

-- =====================================================
-- 5. USERS TABLE - For Service Requests (investors with advisor codes)
-- =====================================================

-- Check if Investment Advisors can view users (for Service Requests)
SELECT 'Step 5: Checking users table policies for Investment Advisors' as info;
SELECT policyname, cmd FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'users'
AND (qual LIKE '%Investment Advisor%' OR qual LIKE '%investment_advisor%' OR qual LIKE '%Public%' OR qual = 'true');

-- Note: Users table should have public read access or Investment Advisor specific policy
-- If not, Investment Advisors won't be able to see investors who entered their code

-- =====================================================
-- 6. STARTUPS TABLE - For Service Requests (startups with advisor codes)
-- =====================================================

-- Check if Investment Advisors can view startups (for Service Requests)
SELECT 'Step 6: Checking startups table policies for Investment Advisors' as info;
SELECT policyname, cmd FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'startups'
AND (qual LIKE '%Investment Advisor%' OR qual LIKE '%investment_advisor%' OR qual LIKE '%Public%' OR qual = 'true');

-- =====================================================
-- 7. FINAL VERIFICATION
-- =====================================================

SELECT 'Step 7: Final Verification - All Tables' as info;
SELECT 
    tablename,
    COUNT(*) as total_policies,
    COUNT(CASE WHEN qual LIKE '%Investment Advisor%' OR qual LIKE '%investment_advisor%' THEN 1 END) as advisor_policies,
    COUNT(CASE WHEN cmd = 'SELECT' THEN 1 END) as select_policies
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

-- Summary
SELECT 
    'Summary' as check_type,
    CASE 
        WHEN COUNT(CASE WHEN tablename = 'advisor_connection_requests' AND qual LIKE '%Investment Advisor%' THEN 1 END) > 0 
        THEN '✅ Service Requests configured'
        ELSE '⚠️ Service Requests may not work'
    END as service_requests,
    CASE 
        WHEN COUNT(CASE WHEN tablename = 'investment_offers' AND qual LIKE '%Investment Advisor%' THEN 1 END) > 0 
        THEN '✅ Investor/Startup Offers configured'
        ELSE '⚠️ Offers may not work'
    END as offers,
    CASE 
        WHEN COUNT(CASE WHEN tablename = 'co_investment_opportunities' AND qual LIKE '%Investment Advisor%' THEN 1 END) > 0 
        THEN '✅ Co-Investment Opportunities configured'
        ELSE '⚠️ Co-Investment Opportunities may not work'
    END as co_investment_opportunities,
    CASE 
        WHEN COUNT(CASE WHEN tablename = 'co_investment_offers' AND qual LIKE '%Investment Advisor%' THEN 1 END) > 0 
        THEN '✅ Co-Investment Offers configured'
        ELSE '⚠️ Co-Investment Offers may not work'
    END as co_investment_offers
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN (
    'advisor_connection_requests',
    'investment_offers',
    'co_investment_opportunities',
    'co_investment_offers'
);





