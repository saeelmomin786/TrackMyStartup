-- =====================================================
-- FIX RECOMMENDATIONS INSERT POLICY
-- =====================================================
-- Quick fix for the INSERT policy that's not working
-- =====================================================

-- Step 1: Check current INSERT policy
SELECT 'Step 1: Current INSERT policy' as check_step;
SELECT 
    policyname,
    cmd,
    qual as using_expression,
    with_check as with_check_expression
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'investment_advisor_recommendations'
AND cmd = 'INSERT';

-- Step 2: Drop existing INSERT policy
DROP POLICY IF EXISTS "Investment Advisors can create recommendations" ON public.investment_advisor_recommendations;
DROP POLICY IF EXISTS "investment_advisor_recommendations_insert_advisor" ON public.investment_advisor_recommendations;

-- Step 3: Create simplified INSERT policy
-- Just check that investment_advisor_id matches auth.uid()
-- No need for role check - RLS will handle access control
CREATE POLICY "Investment Advisors can create recommendations" 
ON public.investment_advisor_recommendations
FOR INSERT 
TO authenticated 
WITH CHECK (
    investment_advisor_id = auth.uid()
);

-- Step 4: Verify the policy was created
SELECT 'Step 4: Verification - New INSERT policy' as check_step;
SELECT 
    policyname,
    cmd,
    CASE 
        WHEN with_check LIKE '%auth.uid()%' THEN '✅ Uses auth.uid()'
        ELSE '❌ Check manually'
    END as auth_method,
    with_check as policy_expression
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'investment_advisor_recommendations'
AND cmd = 'INSERT';

-- Step 5: Final check
SELECT 'Step 5: Final Verification' as check_step;
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_policies
            WHERE schemaname = 'public'
            AND tablename = 'investment_advisor_recommendations'
            AND cmd = 'INSERT'
            AND with_check LIKE '%investment_advisor_id%'
            AND with_check LIKE '%auth.uid()%'
        ) THEN '✅ Investment Advisors can create recommendations'
        ELSE '❌ Investment Advisors CANNOT create recommendations'
    END as create_status;




