-- =====================================================
-- ADD RLS POLICY FOR STARTUPS TO CANCEL THEIR REQUESTS
-- =====================================================
-- This allows startups to update their own mentor requests
-- to cancel them (change status to 'cancelled')

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Requesters can update their requests" ON public.mentor_requests;

-- Create policy for requesters (startups) to update their own requests
-- This allows them to cancel requests (change status to 'cancelled')
CREATE POLICY "Requesters can update their requests" 
ON public.mentor_requests
FOR UPDATE 
TO authenticated
USING (
    -- Allow if requester_id matches auth.uid()
    requester_id = auth.uid()
    OR
    -- Allow if requester_id matches user_profiles.auth_user_id
    EXISTS (
        SELECT 1 FROM public.user_profiles up
        WHERE up.auth_user_id = auth.uid()
        AND up.role = 'Startup'
        AND up.id = requester_id
    )
)
WITH CHECK (
    -- Verify requester still matches
    (
        requester_id = auth.uid()
        OR
        EXISTS (
            SELECT 1 FROM public.user_profiles up
            WHERE up.auth_user_id = auth.uid()
            AND up.role = 'Startup'
            AND up.id = requester_id
        )
    )
);

-- =====================================================
-- ADD RLS POLICY FOR MENTORS TO DELETE CANCELLED REQUESTS
-- =====================================================

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Mentors can delete cancelled requests" ON public.mentor_requests;

-- Create policy for mentors to delete cancelled requests
CREATE POLICY "Mentors can delete cancelled requests" 
ON public.mentor_requests
FOR DELETE 
TO authenticated
USING (
    -- Allow if mentor_id matches auth.uid()
    mentor_id = auth.uid()
    OR
    -- Allow if mentor_id matches user_profiles.auth_user_id
    EXISTS (
        SELECT 1 FROM public.user_profiles up
        WHERE up.auth_user_id = auth.uid()
        AND up.role = 'Mentor'
        AND up.id = mentor_id
    )
);

-- Verify the policies were created
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'mentor_requests'
AND (policyname = 'Requesters can update their requests' 
     OR policyname = 'Mentors can delete cancelled requests')
ORDER BY policyname;
