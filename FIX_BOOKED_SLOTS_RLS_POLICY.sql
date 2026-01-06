-- =====================================================
-- FIX RLS POLICY TO ALLOW STARTUPS TO SEE ALL BOOKED SLOTS
-- =====================================================
-- Problem: Startups can only see their own booked sessions
-- This prevents them from seeing slots booked by other startups
-- Result: Booked slots still appear as available
--
-- Solution: Add policy to allow startups to read ALL scheduled sessions
-- for a mentor (to check availability), not just their own
-- =====================================================

-- Check current policies
SELECT '=== CURRENT POLICIES ===' as info;

SELECT 
    policyname,
    cmd,
    permissive,
    roles,
    qual as using_expression,
    with_check as with_check_expression
FROM pg_policies 
WHERE tablename = 'mentor_startup_sessions'
ORDER BY policyname;

-- Add policy to allow startups to read ALL scheduled sessions for a mentor
-- This is needed to check slot availability (hide booked slots)
-- CRITICAL: This allows startups to see which slots are booked by ANY startup
-- so they can see which slots are unavailable
DROP POLICY IF EXISTS "Startups can view all scheduled sessions for availability check" ON mentor_startup_sessions;

CREATE POLICY "Startups can view all scheduled sessions for availability check"
ON mentor_startup_sessions FOR SELECT
USING (
  -- Allow if user is a startup and there's an active assignment with the mentor
  status = 'scheduled' AND
  EXISTS (
    SELECT 1 FROM public.startups s
    INNER JOIN mentor_startup_assignments msa ON msa.startup_id = s.id
    WHERE s.user_id = auth.uid()
    AND msa.mentor_id = mentor_startup_sessions.mentor_id
    AND msa.status = 'active'
  )
);

-- Verify the new policy
SELECT '=== UPDATED POLICIES ===' as info;

SELECT 
    policyname,
    cmd,
    permissive,
    roles,
    qual as using_expression,
    with_check as with_check_expression
FROM pg_policies 
WHERE tablename = 'mentor_startup_sessions'
ORDER BY policyname;

-- Test query (run as a startup user)
-- This should now return ALL scheduled sessions for the mentor, not just the startup's own
-- SELECT * FROM mentor_startup_sessions 
-- WHERE mentor_id = 'MENTOR_ID' 
-- AND status = 'scheduled'
-- AND session_date >= CURRENT_DATE;

