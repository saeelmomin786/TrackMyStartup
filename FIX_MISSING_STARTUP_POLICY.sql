-- =====================================================
-- FIX MISSING STARTUP POLICY FOR investment_offers
-- =====================================================
-- Ensure Startups can view offers for their startup
-- =====================================================

-- Step 1: Check what policies currently exist
SELECT 'Current policies for investment_offers' as info;
SELECT policyname, cmd, qual 
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'investment_offers'
ORDER BY policyname;

-- Step 2: Check if there's a Startup policy with a different name
SELECT 'Checking for Startup-related policies' as info;
SELECT policyname, cmd, qual 
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'investment_offers'
AND (policyname LIKE '%Startup%' OR policyname LIKE '%startup%' OR qual LIKE '%startup%');

-- Step 3: Drop any existing Startup policy (if it exists with different name)
DROP POLICY IF EXISTS "Startups can view offers for their startup" ON public.investment_offers;
DROP POLICY IF EXISTS "Users can view offers for their startups" ON public.investment_offers;
DROP POLICY IF EXISTS "Allow users to view offers for their startups" ON public.investment_offers;

-- Step 4: Create the Startup policy explicitly
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

-- Step 5: Verification - Check all policies again
SELECT 'Verification: All policies after fix' as info;
SELECT 
    policyname,
    cmd,
    CASE 
        WHEN qual LIKE '%Investment Advisor%' OR qual LIKE '%investment_advisor%' THEN '✅ Investment Advisor Policy'
        WHEN qual LIKE '%Startup%' OR qual LIKE '%startup%' THEN '✅ Startup Policy'
        WHEN qual LIKE '%Investor%' OR qual LIKE '%investor%' THEN '✅ Investor Policy'
        WHEN qual LIKE '%Admin%' OR qual LIKE '%admin%' THEN '✅ Admin Policy'
        WHEN qual LIKE '%Public%' OR qual = 'true' THEN '⚠️ Public Policy'
        ELSE 'Other Policy'
    END as policy_type
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'investment_offers'
ORDER BY policyname;

-- Step 6: Final Safety Check
SELECT 
    'Final Safety Check' as check_type,
    CASE 
        WHEN COUNT(CASE WHEN qual LIKE '%Startup%' OR qual LIKE '%startup%' THEN 1 END) > 0 THEN '✅ Startup access ensured'
        ELSE '❌ No Startup policy found'
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




