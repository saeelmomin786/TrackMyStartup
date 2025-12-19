-- =====================================================
-- FIX RLS POLICIES FOR investment_offers TO USE user_profiles
-- =====================================================
-- This fixes the issue where Investment Advisors can't see Stage 2 offers
-- because RLS policies are checking the old users table instead of user_profiles
-- =====================================================

-- Step 1: Check current policies
SELECT 'Step 1: Current investment_offers policies (BEFORE)' as info;
SELECT policyname, cmd, qual 
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'investment_offers'
ORDER BY policyname;

-- Step 2: Drop and recreate the "Investment Advisors can view offers for their startups" policy
-- This policy allows advisors to see offers for startups they manage (Stage 2 offers)
DROP POLICY IF EXISTS "Investment Advisors can view offers for their startups" ON public.investment_offers;

CREATE POLICY "Investment Advisors can view offers for their startups" 
ON public.investment_offers 
FOR SELECT 
TO authenticated 
USING (
    -- Check if current user is an Investment Advisor in user_profiles
    EXISTS (
        SELECT 1 FROM public.user_profiles advisor
        WHERE advisor.auth_user_id = auth.uid()
        AND advisor.role = 'Investment Advisor'
        AND EXISTS (
            SELECT 1 FROM public.startups s
            WHERE s.id = investment_offers.startup_id
            AND s.investment_advisor_code = advisor.investment_advisor_code
        )
    )
);

-- Step 3: Also update the "Investment Advisors can view offers from their investors" policy
DROP POLICY IF EXISTS "Investment Advisors can view offers from their investors" ON public.investment_offers;

CREATE POLICY "Investment Advisors can view offers from their investors" 
ON public.investment_offers 
FOR SELECT 
TO authenticated 
USING (
    -- Check if current user is an Investment Advisor in user_profiles
    EXISTS (
        SELECT 1 FROM public.user_profiles advisor
        WHERE advisor.auth_user_id = auth.uid()
        AND advisor.role = 'Investment Advisor'
        AND (
            -- Case 1: Investor has entered advisor's code (from user_profiles)
            EXISTS (
                SELECT 1 FROM public.user_profiles investor
                WHERE investor.email = investment_offers.investor_email
                AND investor.investment_advisor_code_entered = advisor.investment_advisor_code
                AND investor.role = 'Investor'
            )
            -- Case 2: Investor is manually added by advisor (still uses old users table structure)
            OR EXISTS (
                SELECT 1 FROM public.advisor_added_investors aai
                WHERE aai.email = investment_offers.investor_email
                AND aai.advisor_id::text = auth.uid()::text
            )
        )
    )
);

-- Step 4: Update investor policy to also check user_profiles
DROP POLICY IF EXISTS "Investors can view their own offers" ON public.investment_offers;

CREATE POLICY "Investors can view their own offers" 
ON public.investment_offers 
FOR SELECT 
TO authenticated 
USING (
    investor_email = (
        SELECT email FROM public.user_profiles 
        WHERE auth_user_id = auth.uid()
        AND role = 'Investor'
        LIMIT 1
    )
    -- Fallback to users table for backward compatibility
    OR investor_email = (
        SELECT email FROM public.users 
        WHERE id = auth.uid()
        LIMIT 1
    )
);

-- Step 5: Update admin policy to check user_profiles
DROP POLICY IF EXISTS "Admins can view all offers" ON public.investment_offers;

CREATE POLICY "Admins can view all offers" 
ON public.investment_offers 
FOR ALL 
TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM public.user_profiles 
        WHERE auth_user_id = auth.uid() 
        AND role = 'Admin'
    )
    -- Fallback to users table for backward compatibility
    OR EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = auth.uid() 
        AND role = 'Admin'
    )
);

-- Step 6: Verification - List all policies AFTER changes
SELECT 'Step 6: All investment_offers policies (AFTER)' as info;
SELECT 
    policyname,
    cmd,
    CASE 
        WHEN qual LIKE '%user_profiles%' THEN '✅ Uses user_profiles (NEW)'
        WHEN qual LIKE '%users%' THEN '⚠️ Still uses users table (may need update)'
        WHEN qual LIKE '%Investment Advisor%' THEN '✅ Investment Advisor Policy'
        WHEN qual LIKE '%Startup%' THEN '✅ Startup Policy'
        WHEN qual LIKE '%Investor%' THEN '✅ Investor Policy'
        WHEN qual LIKE '%Admin%' THEN '✅ Admin Policy'
        ELSE 'Other Policy'
    END as policy_type
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'investment_offers'
ORDER BY policyname;

-- Step 7: Test query to verify advisor can see Stage 2 offers
-- Replace '8051e27f-001f-4734-b00c-dcde9760086c' with the actual advisor's auth_user_id
SELECT 
    'Test Query' as info,
    COUNT(*) as stage_2_offers_visible,
    COUNT(CASE WHEN stage = 2 THEN 1 END) as stage_2_count
FROM public.investment_offers
WHERE stage IN (1, 2, 4);

