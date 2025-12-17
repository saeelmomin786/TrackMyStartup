-- =====================================================
-- FIX RLS POLICIES FOR INVESTMENT ADVISOR DISCOVER PITCHES
-- =====================================================
-- Fix policies so Investment Advisors can view:
-- 1. Their own due diligence requests
-- 2. Their own recommendations
-- =====================================================

-- =====================================================
-- 1. FIX due_diligence_requests POLICIES
-- =====================================================

-- Check current policies
SELECT 'Current due_diligence_requests policies' as info;
SELECT policyname, cmd, qual, with_check 
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'due_diligence_requests';

-- Drop existing policies that might be blocking Investment Advisors
DROP POLICY IF EXISTS "Users can view own due diligence requests" ON public.due_diligence_requests;
DROP POLICY IF EXISTS "Users can insert own due diligence requests" ON public.due_diligence_requests;
DROP POLICY IF EXISTS "Users can update own due diligence requests" ON public.due_diligence_requests;

-- Create policies that allow Investment Advisors to view their own requests
-- Note: due_diligence_requests.user_id is FK to users(id), so must use auth.uid()

-- Policy: Users (including Investment Advisors) can view their own due diligence requests
CREATE POLICY "Users can view own due diligence requests" 
ON public.due_diligence_requests 
FOR SELECT 
TO authenticated 
USING (user_id = auth.uid());

-- Policy: Users (including Investment Advisors) can insert their own due diligence requests
CREATE POLICY "Users can insert own due diligence requests" 
ON public.due_diligence_requests 
FOR INSERT 
TO authenticated 
WITH CHECK (user_id = auth.uid());

-- Policy: Users (including Investment Advisors) can update their own due diligence requests
CREATE POLICY "Users can update own due diligence requests" 
ON public.due_diligence_requests 
FOR UPDATE 
TO authenticated 
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Policy: Startups can view due diligence requests for their startups
CREATE POLICY "Startups can view requests for their startups" 
ON public.due_diligence_requests 
FOR SELECT 
TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM public.startups s
        WHERE s.id::text = due_diligence_requests.startup_id::text
        AND s.user_id = auth.uid()
    )
);

-- Policy: Startups can update due diligence requests for their startups (to approve/reject)
CREATE POLICY "Startups can update requests for their startups" 
ON public.due_diligence_requests 
FOR UPDATE 
TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM public.startups s
        WHERE s.id::text = due_diligence_requests.startup_id::text
        AND s.user_id = auth.uid()
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.startups s
        WHERE s.id::text = due_diligence_requests.startup_id::text
        AND s.user_id = auth.uid()
    )
);

-- =====================================================
-- 2. FIX investment_advisor_recommendations POLICIES
-- =====================================================

-- Check current policies
SELECT 'Current investment_advisor_recommendations policies' as info;
SELECT policyname, cmd, qual, with_check 
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'investment_advisor_recommendations';

-- Drop existing policies that might be blocking Investment Advisors
DROP POLICY IF EXISTS "Investment Advisors can view their own recommendations" ON public.investment_advisor_recommendations;
DROP POLICY IF EXISTS "Investment Advisors can create recommendations" ON public.investment_advisor_recommendations;
DROP POLICY IF EXISTS "Investors can view recommendations made to them" ON public.investment_advisor_recommendations;
DROP POLICY IF EXISTS "Users can update recommendation status" ON public.investment_advisor_recommendations;

-- Note: investment_advisor_recommendations.investment_advisor_id is FK to users(id)
-- Note: investment_advisor_recommendations.investor_id is FK to users(id)
-- Both must use auth.uid()

-- Policy: Investment Advisors can view their own recommendations
CREATE POLICY "Investment Advisors can view their own recommendations" 
ON public.investment_advisor_recommendations 
FOR SELECT 
TO authenticated 
USING (investment_advisor_id = auth.uid());

-- Policy: Investment Advisors can create recommendations
CREATE POLICY "Investment Advisors can create recommendations" 
ON public.investment_advisor_recommendations 
FOR INSERT 
TO authenticated 
WITH CHECK (investment_advisor_id = auth.uid());

-- Policy: Investors can view recommendations made to them
CREATE POLICY "Investors can view recommendations made to them" 
ON public.investment_advisor_recommendations 
FOR SELECT 
TO authenticated 
USING (investor_id = auth.uid());

-- Policy: Investment Advisors can update their own recommendations
CREATE POLICY "Investment Advisors can update their own recommendations" 
ON public.investment_advisor_recommendations 
FOR UPDATE 
TO authenticated 
USING (investment_advisor_id = auth.uid())
WITH CHECK (investment_advisor_id = auth.uid());

-- Policy: Investors can update recommendation status (to mark as viewed/interested)
CREATE POLICY "Investors can update recommendation status" 
ON public.investment_advisor_recommendations 
FOR UPDATE 
TO authenticated 
USING (investor_id = auth.uid())
WITH CHECK (investor_id = auth.uid());

-- =====================================================
-- 3. VERIFICATION
-- =====================================================

-- Verify due_diligence_requests policies
SELECT 'Verified due_diligence_requests policies' as info;
SELECT policyname, cmd 
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'due_diligence_requests'
ORDER BY policyname;

-- Verify investment_advisor_recommendations policies
SELECT 'Verified investment_advisor_recommendations policies' as info;
SELECT policyname, cmd 
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'investment_advisor_recommendations'
ORDER BY policyname;

-- Summary
SELECT 
    'Summary' as category,
    tablename,
    COUNT(*) as policy_count,
    CASE 
        WHEN BOOL_OR(qual LIKE '%auth.uid()%' OR with_check LIKE '%auth.uid()%') THEN '✅ Uses auth.uid()'
        ELSE '⚠️ Check policies'
    END as status
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('due_diligence_requests', 'investment_advisor_recommendations')
GROUP BY tablename;




