-- =====================================================
-- FIX RLS POLICIES FOR investment_offers
-- =====================================================
-- Allow Investment Advisors to view offers from their assigned investors and startups
-- =====================================================

-- Step 1: Check current policies
SELECT 'Step 1: Current investment_offers policies' as info;
SELECT policyname, cmd, qual, with_check 
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'investment_offers'
ORDER BY policyname;

-- Step 2: Enable RLS if not already enabled
ALTER TABLE public.investment_offers ENABLE ROW LEVEL SECURITY;

-- Step 3: Drop existing policies that might be blocking Investment Advisors
DROP POLICY IF EXISTS "Investment Advisors can view offers from their investors" ON public.investment_offers;
DROP POLICY IF EXISTS "Investment Advisors can view offers for their startups" ON public.investment_offers;

-- Step 4: Create policy for Investment Advisors to view offers from their assigned investors
-- This policy allows Investment Advisors to see offers where:
-- 1. The investor_email matches an investor who has entered the advisor's code (TMS investors)
-- 2. OR the investor_email matches a manually added investor (advisor_added_investors)
CREATE POLICY "Investment Advisors can view offers from their investors" 
ON public.investment_offers 
FOR SELECT 
TO authenticated 
USING (
    -- Check if current user is an Investment Advisor
    EXISTS (
        SELECT 1 FROM public.users advisor
        WHERE advisor.id = auth.uid()
        AND advisor.role = 'Investment Advisor'
        AND (
            -- Case 1: Investor has entered advisor's code (TMS investors)
            EXISTS (
                SELECT 1 FROM public.users investor
                WHERE investor.email = investment_offers.investor_email
                AND investor.investment_advisor_code_entered = advisor.investment_advisor_code
                AND investor.role = 'Investor'
            )
            -- Case 2: Investor is manually added by advisor
            OR EXISTS (
                SELECT 1 FROM public.advisor_added_investors aai
                WHERE aai.email = investment_offers.investor_email
                AND aai.advisor_id::text = auth.uid()::text
            )
        )
    )
);

-- Step 5: Create policy for Investment Advisors to view offers for their assigned startups
-- This policy allows Investment Advisors to see offers where:
-- The startup has entered the advisor's code
CREATE POLICY "Investment Advisors can view offers for their startups" 
ON public.investment_offers 
FOR SELECT 
TO authenticated 
USING (
    -- Check if current user is an Investment Advisor
    EXISTS (
        SELECT 1 FROM public.users advisor
        WHERE advisor.id = auth.uid()
        AND advisor.role = 'Investment Advisor'
        AND EXISTS (
            SELECT 1 FROM public.startups s
            WHERE s.id = investment_offers.startup_id
            AND s.investment_advisor_code = advisor.investment_advisor_code
        )
    )
);

-- Step 6: Ensure policy for Startups to view offers for their startup
DROP POLICY IF EXISTS "Startups can view offers for their startup" ON public.investment_offers;

CREATE POLICY "Startups can view offers for their startup" 
ON public.investment_offers 
FOR SELECT 
TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM public.startups s
        WHERE s.id = investment_offers.startup_id
        AND s.user_id = auth.uid()
    )
);

-- Step 7: Ensure policy for investors to view their own offers
DROP POLICY IF EXISTS "Investors can view their own offers" ON public.investment_offers;

CREATE POLICY "Investors can view their own offers" 
ON public.investment_offers 
FOR SELECT 
TO authenticated 
USING (
    investor_email = (
        SELECT email FROM public.users 
        WHERE id = auth.uid()
    )
);

-- Step 8: Ensure admin policy
DROP POLICY IF EXISTS "Admins can view all offers" ON public.investment_offers;

CREATE POLICY "Admins can view all offers" 
ON public.investment_offers 
FOR ALL 
TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = auth.uid() 
        AND role = 'Admin'
    )
);

-- Step 9: Verification - List all policies
SELECT 
    'Step 9: Verification - All Policies' as info,
    policyname,
    cmd,
    CASE 
        WHEN qual LIKE '%Investment Advisor%' OR qual LIKE '%investment_advisor%' THEN '✅ Investment Advisor Policy'
        WHEN qual LIKE '%Startup%' THEN '✅ Startup Policy'
        WHEN qual LIKE '%Investor%' THEN '✅ Investor Policy'
        WHEN qual LIKE '%Admin%' THEN '✅ Admin Policy'
        ELSE 'Other Policy'
    END as policy_type
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'investment_offers'
ORDER BY policyname;

-- Step 10: Summary
SELECT 
    'Summary' as check_type,
    COUNT(*) as total_policies,
    COUNT(CASE WHEN qual LIKE '%Investment Advisor%' OR qual LIKE '%investment_advisor%' THEN 1 END) as advisor_policies,
    COUNT(CASE WHEN qual LIKE '%Startup%' THEN 1 END) as startup_policies,
    COUNT(CASE WHEN qual LIKE '%Investor%' THEN 1 END) as investor_policies,
    COUNT(CASE WHEN qual LIKE '%Admin%' THEN 1 END) as admin_policies
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'investment_offers';

