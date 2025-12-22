-- =====================================================
-- FIX MENTOR_STARTUP_SESSIONS INSERT RLS FOR STARTUPS
-- =====================================================
-- This script adds an RLS policy to allow startups to insert sessions
-- when booking sessions with their assigned mentors.
--
-- Problem: Startups cannot book sessions because the INSERT policy
-- only allows mentors (auth.uid() = mentor_id).
--
-- Solution: Add a policy that allows startups to insert sessions
-- where startup_id matches their startup.
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

-- Add policy for startups to insert their own sessions
-- This allows startups to book sessions with mentors
DROP POLICY IF EXISTS "Startups can create sessions" ON mentor_startup_sessions;

CREATE POLICY "Startups can create sessions"
ON mentor_startup_sessions FOR INSERT
WITH CHECK (
  -- Startup must own the startup_id
  EXISTS (
    SELECT 1 FROM public.startups s
    WHERE s.id = mentor_startup_sessions.startup_id
    AND s.user_id = auth.uid()
  )
  -- Ensure there's a valid assignment between mentor and startup
  AND EXISTS (
    SELECT 1 FROM mentor_startup_assignments msa
    WHERE msa.id = mentor_startup_sessions.assignment_id
    AND msa.startup_id = mentor_startup_sessions.startup_id
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



