-- =====================================================
-- FIX ADVISOR CONNECTION REQUESTS RLS POLICIES
-- =====================================================
-- Run this if you're getting 403 errors when creating requests
-- This ensures all policies are correctly set up

-- First, ensure RLS is enabled
ALTER TABLE public.advisor_connection_requests ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies to start fresh
DROP POLICY IF EXISTS "Advisors can view their own connection requests" ON public.advisor_connection_requests;
DROP POLICY IF EXISTS "Requesters can view their own connection requests" ON public.advisor_connection_requests;
DROP POLICY IF EXISTS "Users can create connection requests to advisors" ON public.advisor_connection_requests;
DROP POLICY IF EXISTS "Advisors can update their own connection requests" ON public.advisor_connection_requests;
DROP POLICY IF EXISTS "Advisors can delete their own connection requests" ON public.advisor_connection_requests;

-- Policy 1: Advisors can view requests sent TO them
CREATE POLICY "Advisors can view their own connection requests"
    ON public.advisor_connection_requests
    FOR SELECT
    USING (auth.uid() = advisor_id);

-- Policy 2: Requesters can view requests they sent
CREATE POLICY "Requesters can view their own connection requests"
    ON public.advisor_connection_requests
    FOR SELECT
    USING (auth.uid() = requester_id);

-- Policy 3: Users can INSERT requests (they are the requester)
CREATE POLICY "Users can create connection requests to advisors"
    ON public.advisor_connection_requests
    FOR INSERT
    WITH CHECK (auth.uid() = requester_id);

-- Policy 4: Advisors can UPDATE requests sent to them
CREATE POLICY "Advisors can update their own connection requests"
    ON public.advisor_connection_requests
    FOR UPDATE
    USING (auth.uid() = advisor_id)
    WITH CHECK (auth.uid() = advisor_id);

-- Policy 5: Advisors can DELETE requests sent to them
CREATE POLICY "Advisors can delete their own connection requests"
    ON public.advisor_connection_requests
    FOR DELETE
    USING (auth.uid() = advisor_id);

-- Verify policies were created
SELECT 
    policyname,
    cmd as command,
    qual as using_expression,
    with_check as with_check_expression
FROM pg_policies
WHERE schemaname = 'public' 
    AND tablename = 'advisor_connection_requests'
ORDER BY policyname;


