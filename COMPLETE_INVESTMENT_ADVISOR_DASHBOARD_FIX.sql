-- =====================================================
-- COMPLETE FIX FOR INVESTMENT ADVISOR DASHBOARD
-- =====================================================
-- Fixes all 4 sections:
-- 1. Service Requests
-- 2. Investor Offers
-- 3. Startup Offers
-- 4. Co-Investment Opportunities
-- =====================================================
-- IMPORTANT: This script checks existing policies first
-- and only adds what's missing
-- =====================================================

-- =====================================================
-- STEP 0: CHECK EXISTING POLICIES FIRST
-- =====================================================

SELECT 'Step 0: Checking existing policies BEFORE making changes' as info;

-- Check advisor_connection_requests
SELECT 'Current advisor_connection_requests policies:' as check_section;
SELECT policyname, cmd FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'advisor_connection_requests'
ORDER BY policyname;

-- Check users table
SELECT 'Current users table policies:' as check_section;
SELECT policyname, cmd FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'users' AND cmd = 'SELECT'
ORDER BY policyname;

-- Check startups table
SELECT 'Current startups table policies:' as check_section;
SELECT policyname, cmd FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'startups' AND cmd = 'SELECT'
ORDER BY policyname;

-- Check investment_offers
SELECT 'Current investment_offers policies:' as check_section;
SELECT policyname, cmd FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'investment_offers' AND cmd = 'SELECT'
ORDER BY policyname;

-- Check co_investment_opportunities
SELECT 'Current co_investment_opportunities policies:' as check_section;
SELECT policyname, cmd FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'co_investment_opportunities' AND cmd = 'SELECT'
ORDER BY policyname;

-- Check co_investment_offers
SELECT 'Current co_investment_offers policies:' as check_section;
SELECT policyname, cmd FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'co_investment_offers' AND cmd = 'SELECT'
ORDER BY policyname;

-- =====================================================
-- SECTION 1: SERVICE REQUESTS
-- =====================================================

-- 1.1: Fix advisor_connection_requests (only if policy doesn't exist)
ALTER TABLE public.advisor_connection_requests ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    -- Only create if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
        AND tablename = 'advisor_connection_requests'
        AND (qual LIKE '%Investment Advisor%' OR qual LIKE '%advisor_id%')
    ) THEN
        -- Drop any existing policy with similar name first
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
        
        RAISE NOTICE 'Created advisor_connection_requests policy for Investment Advisors';
    ELSE
        RAISE NOTICE 'advisor_connection_requests policy already exists - skipping';
    END IF;
END $$;

-- 1.2: Fix users table (for Service Requests - investors with advisor codes)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Only create if no public read policy exists AND no Investment Advisor policy exists
DO $$
BEGIN
    -- Check if there's already a public read policy (allows all)
    IF EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
        AND tablename = 'users'
        AND cmd = 'SELECT'
        AND (qual = 'true' OR qual LIKE '%Public%')
    ) THEN
        RAISE NOTICE 'users table has public read policy - Investment Advisors can already access it';
    -- Check if Investment Advisor policy already exists
    ELSIF EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
        AND tablename = 'users'
        AND cmd = 'SELECT'
        AND (qual LIKE '%Investment Advisor%' OR qual LIKE '%investment_advisor%')
    ) THEN
        RAISE NOTICE 'users table already has Investment Advisor policy - skipping';
    -- Create Investment Advisor policy if it doesn't exist
    ELSE
        IF NOT EXISTS (
            SELECT 1 FROM pg_policies
            WHERE schemaname = 'public'
            AND tablename = 'users'
            AND policyname = 'Investment Advisors can view users'
        ) THEN
            CREATE POLICY "Investment Advisors can view users" 
            ON public.users 
            FOR SELECT 
            TO authenticated 
            USING (
                EXISTS (
                    SELECT 1 FROM public.users advisor
                    WHERE advisor.id = auth.uid()
                    AND advisor.role = 'Investment Advisor'
                )
            );
            RAISE NOTICE 'Created users table policy for Investment Advisors';
        END IF;
    END IF;
END $$;

-- 1.3: Fix startups table (for Service Requests - startups with advisor codes)
ALTER TABLE public.startups ENABLE ROW LEVEL SECURITY;

-- Only create if no public read policy exists AND no Investment Advisor policy exists
DO $$
BEGIN
    -- Check if there's already a public read policy (allows all)
    IF EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
        AND tablename = 'startups'
        AND cmd = 'SELECT'
        AND (qual = 'true' OR qual LIKE '%Public%')
    ) THEN
        RAISE NOTICE 'startups table has public read policy - Investment Advisors can already access it';
    -- Check if Investment Advisor policy already exists
    ELSIF EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
        AND tablename = 'startups'
        AND cmd = 'SELECT'
        AND (qual LIKE '%Investment Advisor%' OR qual LIKE '%investment_advisor%')
    ) THEN
        RAISE NOTICE 'startups table already has Investment Advisor policy - skipping';
    -- Create Investment Advisor policy if it doesn't exist
    ELSE
        IF NOT EXISTS (
            SELECT 1 FROM pg_policies
            WHERE schemaname = 'public'
            AND tablename = 'startups'
            AND policyname = 'Investment Advisors can view startups'
        ) THEN
            CREATE POLICY "Investment Advisors can view startups" 
            ON public.startups 
            FOR SELECT 
            TO authenticated 
            USING (
                EXISTS (
                    SELECT 1 FROM public.users advisor
                    WHERE advisor.id = auth.uid()
                    AND advisor.role = 'Investment Advisor'
                )
            );
            RAISE NOTICE 'Created startups table policy for Investment Advisors';
        END IF;
    END IF;
END $$;

-- =====================================================
-- SECTION 2 & 3: INVESTOR OFFERS & STARTUP OFFERS
-- =====================================================
-- (Should already be fixed in FIX_INVESTMENT_ADVISOR_OFFERS_RLS_SAFE.sql)
-- Just verify they exist - don't recreate if they already exist

SELECT 'Verifying investment_offers policies' as info;
SELECT 
    policyname,
    CASE 
        WHEN qual LIKE '%Investment Advisor%' AND qual LIKE '%investor%' THEN '✅ Investor Offers policy'
        WHEN qual LIKE '%Investment Advisor%' AND qual LIKE '%startup%' THEN '✅ Startup Offers policy'
        WHEN qual LIKE '%Investment Advisor%' THEN '✅ Investment Advisor policy (general)'
        ELSE 'Other policy'
    END as policy_type
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'investment_offers'
AND cmd = 'SELECT'
ORDER BY policyname;

-- Check if Investment Advisor policies exist
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
        AND tablename = 'investment_offers'
        AND cmd = 'SELECT'
        AND qual LIKE '%Investment Advisor%'
    ) THEN
        RAISE NOTICE 'investment_offers already has Investment Advisor policies - skipping';
    ELSE
        RAISE NOTICE '⚠️ WARNING: investment_offers may be missing Investment Advisor policies. Run FIX_INVESTMENT_ADVISOR_OFFERS_RLS_SAFE.sql first.';
    END IF;
END $$;

-- =====================================================
-- SECTION 4: CO-INVESTMENT OPPORTUNITIES
-- =====================================================

-- 4.1: Fix co_investment_opportunities (only if policy doesn't exist)
ALTER TABLE public.co_investment_opportunities ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    -- Check if there's already a public read policy or Investment Advisor policy
    IF EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
        AND tablename = 'co_investment_opportunities'
        AND cmd = 'SELECT'
        AND (qual = 'true' OR qual LIKE '%Public%' OR qual LIKE '%Investment Advisor%')
    ) THEN
        RAISE NOTICE 'co_investment_opportunities already has access policy - skipping';
    ELSE
        -- Drop any existing policy with similar name first
        DROP POLICY IF EXISTS "Investment Advisors can view all co-investment opportunities" ON public.co_investment_opportunities;
        
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
        
        RAISE NOTICE 'Created co_investment_opportunities policy for Investment Advisors';
    END IF;
END $$;

-- 4.2: Verify co_investment_offers policy exists
-- (Should already exist from CREATE_CO_INVESTMENT_OFFERS_TABLE.sql)
SELECT 'Verifying co_investment_offers policies' as info;
SELECT 
    policyname,
    CASE 
        WHEN qual LIKE '%Investment Advisor%' THEN '✅ Investment Advisor policy'
        WHEN qual LIKE '%clients%' THEN '✅ Clients policy'
        ELSE 'Other policy'
    END as policy_type
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'co_investment_offers'
AND cmd = 'SELECT'
ORDER BY policyname;

-- Check if Investment Advisor policy exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
        AND tablename = 'co_investment_offers'
        AND cmd = 'SELECT'
        AND qual LIKE '%Investment Advisor%'
    ) THEN
        RAISE NOTICE 'co_investment_offers already has Investment Advisor policy - skipping';
    ELSE
        RAISE NOTICE '⚠️ WARNING: co_investment_offers may be missing Investment Advisor policy. Check CREATE_CO_INVESTMENT_OFFERS_TABLE.sql.';
    END IF;
END $$;

-- =====================================================
-- FINAL VERIFICATION
-- =====================================================

SELECT 'FINAL VERIFICATION' as info;
SELECT 
    tablename,
    COUNT(*) as total_policies,
    COUNT(CASE WHEN qual LIKE '%Investment Advisor%' OR qual LIKE '%investment_advisor%' THEN 1 END) as advisor_policies,
    COUNT(CASE WHEN cmd = 'SELECT' THEN 1 END) as select_policies
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN (
    'advisor_connection_requests',
    'users',
    'startups',
    'investment_offers',
    'co_investment_opportunities',
    'co_investment_offers'
)
GROUP BY tablename
ORDER BY tablename;

-- Final Status Check
SELECT 
    'Final Status' as check_type,
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
        THEN '✅ Service Requests configured'
        ELSE '❌ Service Requests missing policies'
    END as service_requests,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_policies
            WHERE schemaname = 'public'
            AND tablename = 'investment_offers'
            AND qual LIKE '%Investment Advisor%'
            AND qual LIKE '%investor%'
        )
        THEN '✅ Investor Offers configured'
        ELSE '❌ Investor Offers missing policies'
    END as investor_offers,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_policies
            WHERE schemaname = 'public'
            AND tablename = 'investment_offers'
            AND qual LIKE '%Investment Advisor%'
            AND qual LIKE '%startup%'
        )
        THEN '✅ Startup Offers configured'
        ELSE '❌ Startup Offers missing policies'
    END as startup_offers,
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
        THEN '✅ Co-Investment Opportunities configured'
        ELSE '❌ Co-Investment Opportunities missing policies'
    END as co_investment_opportunities;


