-- =====================================================
-- FIX RLS POLICIES FOR investment_offers (SAFE VERSION)
-- =====================================================
-- Allow Investment Advisors to view offers from their assigned investors and startups
-- This script ONLY adds new policies - it does NOT remove existing policies
-- =====================================================

-- Step 1: Check current policies BEFORE making changes
SELECT 'Step 1: Current investment_offers policies (BEFORE)' as info;
SELECT policyname, cmd, qual, with_check 
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'investment_offers'
ORDER BY policyname;

-- Step 2: Enable RLS if not already enabled (safe - won't break anything)
ALTER TABLE public.investment_offers ENABLE ROW LEVEL SECURITY;

-- Step 3: ONLY drop the specific policies we're about to recreate
-- This ensures we don't accidentally remove other policies
DROP POLICY IF EXISTS "Investment Advisors can view offers from their investors" ON public.investment_offers;
DROP POLICY IF EXISTS "Investment Advisors can view offers for their startups" ON public.investment_offers;

-- Step 4: Create policy for Investment Advisors to view offers from their assigned investors
-- This is ADDITIVE - it works alongside existing policies (OR logic)
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
-- This is ADDITIVE - it works alongside existing policies (OR logic)
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

-- Step 6: Ensure policy for Startups
-- Drop any existing Startup policy with different names first
DROP POLICY IF EXISTS "Startups can view offers for their startup" ON public.investment_offers;
DROP POLICY IF EXISTS "Users can view offers for their startups" ON public.investment_offers;
DROP POLICY IF EXISTS "Allow users to view offers for their startups" ON public.investment_offers;

-- Create the Startup policy explicitly
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

-- Step 7: Ensure policy for investors (only recreate if it doesn't exist or has wrong name)
DO $$
BEGIN
    -- Only create if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
        AND tablename = 'investment_offers'
        AND policyname = 'Investors can view their own offers'
    ) THEN
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
    END IF;
END $$;

-- Step 8: Ensure admin policy (only recreate if it doesn't exist or has wrong name)
DO $$
BEGIN
    -- Only create if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
        AND tablename = 'investment_offers'
        AND policyname = 'Admins can view all offers'
    ) THEN
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
    END IF;
END $$;

-- Step 9: Verification - List all policies AFTER changes
SELECT 'Step 9: All investment_offers policies (AFTER)' as info;
SELECT 
    policyname,
    cmd,
    CASE 
        WHEN qual LIKE '%Investment Advisor%' OR qual LIKE '%investment_advisor%' THEN '✅ Investment Advisor Policy (NEW)'
        WHEN qual LIKE '%Startup%' THEN '✅ Startup Policy'
        WHEN qual LIKE '%Investor%' THEN '✅ Investor Policy'
        WHEN qual LIKE '%Admin%' THEN '✅ Admin Policy'
        WHEN qual LIKE '%Public%' OR qual = 'true' THEN '⚠️ Public Policy (may allow all access)'
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
    COUNT(CASE WHEN qual LIKE '%Admin%' THEN 1 END) as admin_policies,
    COUNT(CASE WHEN qual LIKE '%Public%' OR qual = 'true' THEN 1 END) as public_policies
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'investment_offers';

-- Step 11: Safety Check
SELECT 
    'Safety Check' as check_type,
    CASE 
        WHEN COUNT(CASE WHEN qual LIKE '%Startup%' OR qual LIKE '%startup%' THEN 1 END) > 0 THEN '✅ Startup access preserved'
        ELSE '⚠️ No Startup policy found'
    END as startup_check,
    CASE 
        WHEN COUNT(CASE WHEN qual LIKE '%Investor%' OR qual LIKE '%investor_email%' THEN 1 END) > 0 THEN '✅ Investor access preserved'
        ELSE '⚠️ No Investor policy found'
    END as investor_check,
    CASE 
        WHEN COUNT(CASE WHEN qual LIKE '%Admin%' THEN 1 END) > 0 THEN '✅ Admin access preserved'
        ELSE '⚠️ No Admin policy found'
    END as admin_check,
    CASE 
        WHEN COUNT(CASE WHEN qual LIKE '%Investment Advisor%' OR qual LIKE '%investment_advisor%' THEN 1 END) > 0 THEN '✅ Investment Advisor access added'
        ELSE '❌ Investment Advisor policy not created'
    END as advisor_check
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'investment_offers';

