-- Fix missing DELETE policy for facilitator_startups table
-- This allows facilitators to delete their own startup relationships

-- Add the missing DELETE policy
CREATE POLICY "Facilitators can delete their own startup relationships" ON public.facilitator_startups
    FOR DELETE USING (auth.uid() = facilitator_id);

-- Verify the policy was created
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
WHERE tablename = 'facilitator_startups'
ORDER BY policyname;
