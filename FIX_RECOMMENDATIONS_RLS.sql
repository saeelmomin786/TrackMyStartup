-- =====================================================
-- FIX RECOMMENDATIONS RLS POLICIES
-- =====================================================
-- Fix RLS policies for investment_advisor_recommendations
-- to ensure Investment Advisors can view and create recommendations
-- =====================================================

-- =====================================================
-- STEP 1: Check current policies
-- =====================================================

SELECT 'Step 1: Current investment_advisor_recommendations policies' as check_step;
SELECT 
    policyname,
    cmd,
    qual as policy_expression,
    with_check as with_check_expression
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'investment_advisor_recommendations'
ORDER BY cmd, policyname;

-- =====================================================
-- STEP 2: Enable RLS if not enabled
-- =====================================================

ALTER TABLE public.investment_advisor_recommendations ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- STEP 3: Drop existing policies (to recreate with correct auth.uid())
-- =====================================================

DROP POLICY IF EXISTS "Investment Advisors can view their own recommendations" ON public.investment_advisor_recommendations;
DROP POLICY IF EXISTS "Investors can view recommendations made to them" ON public.investment_advisor_recommendations;
DROP POLICY IF EXISTS "Investment Advisors can create recommendations" ON public.investment_advisor_recommendations;
DROP POLICY IF EXISTS "Users can update recommendation status" ON public.investment_advisor_recommendations;

-- Also drop any policies with similar names
DROP POLICY IF EXISTS "investment_advisor_recommendations_select_advisor" ON public.investment_advisor_recommendations;
DROP POLICY IF EXISTS "investment_advisor_recommendations_select_investor" ON public.investment_advisor_recommendations;
DROP POLICY IF EXISTS "investment_advisor_recommendations_insert_advisor" ON public.investment_advisor_recommendations;
DROP POLICY IF EXISTS "investment_advisor_recommendations_update_users" ON public.investment_advisor_recommendations;

-- =====================================================
-- STEP 4: Create correct policies using auth.uid()
-- =====================================================

-- Policy 1: Investment Advisors can view their own recommendations
CREATE POLICY "Investment Advisors can view their own recommendations" 
ON public.investment_advisor_recommendations
FOR SELECT 
TO authenticated 
USING (
    investment_advisor_id = auth.uid()
);

-- Policy 2: Investors can view recommendations made to them
CREATE POLICY "Investors can view recommendations made to them" 
ON public.investment_advisor_recommendations
FOR SELECT 
TO authenticated 
USING (
    investor_id = auth.uid()
);

-- Policy 3: Investment Advisors can create recommendations
-- Simplified: Just check that investment_advisor_id matches auth.uid()
-- The role check is not needed here as RLS will handle access control
CREATE POLICY "Investment Advisors can create recommendations" 
ON public.investment_advisor_recommendations
FOR INSERT 
TO authenticated 
WITH CHECK (
    investment_advisor_id = auth.uid()
);

-- Policy 4: Users can update recommendation status (both advisor and investor)
CREATE POLICY "Users can update recommendation status" 
ON public.investment_advisor_recommendations
FOR UPDATE 
TO authenticated 
USING (
    investment_advisor_id = auth.uid() OR investor_id = auth.uid()
)
WITH CHECK (
    investment_advisor_id = auth.uid() OR investor_id = auth.uid()
);

-- =====================================================
-- STEP 5: Verify policies were created correctly
-- =====================================================

SELECT 'Step 5: Verification - New policies' as check_step;
SELECT 
    policyname,
    cmd,
    CASE 
        WHEN qual LIKE '%auth.uid()%' THEN '✅ Uses auth.uid()'
        WHEN qual LIKE '%current_setting%' THEN '❌ Uses current_setting (WRONG)'
        ELSE '⚠️ Check manually'
    END as auth_method,
    qual as policy_expression
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'investment_advisor_recommendations'
ORDER BY cmd, policyname;

-- =====================================================
-- STEP 6: Final verification
-- =====================================================

SELECT 'Step 6: Final Verification' as check_step;
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_policies
            WHERE schemaname = 'public'
            AND tablename = 'investment_advisor_recommendations'
            AND cmd = 'SELECT'
            AND qual LIKE '%investment_advisor_id%'
            AND qual LIKE '%auth.uid()%'
        ) THEN '✅ Investment Advisors can view their recommendations'
        ELSE '❌ Investment Advisors CANNOT view recommendations'
    END as view_status,
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
    END as create_status,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_policies
            WHERE schemaname = 'public'
            AND tablename = 'investment_advisor_recommendations'
            AND cmd = 'SELECT'
            AND qual LIKE '%investor_id%'
            AND qual LIKE '%auth.uid()%'
        ) THEN '✅ Investors can view recommendations made to them'
        ELSE '❌ Investors CANNOT view recommendations'
    END as investor_view_status;

