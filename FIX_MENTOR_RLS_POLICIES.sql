-- =====================================================
-- FIX MENTOR RLS POLICIES FOR INSERT/UPDATE
-- =====================================================
-- This script ensures mentors can insert and update
-- their own mentoring data in mentor_startup_assignments
-- and mentor_founded_startups tables
-- =====================================================

-- =====================================================
-- STEP 1: VERIFY RLS IS ENABLED
-- =====================================================
ALTER TABLE mentor_startup_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE mentor_founded_startups ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- STEP 2: DROP EXISTING POLICIES (IF ANY)
-- =====================================================
DROP POLICY IF EXISTS "Mentors can insert their assignments" ON mentor_startup_assignments;
DROP POLICY IF EXISTS "Mentors can update their assignments" ON mentor_startup_assignments;
DROP POLICY IF EXISTS "Mentors can delete their assignments" ON mentor_startup_assignments;
DROP POLICY IF EXISTS "Mentors can insert their founded startups" ON mentor_founded_startups;
DROP POLICY IF EXISTS "Mentors can update their founded startups" ON mentor_founded_startups;
DROP POLICY IF EXISTS "Mentors can delete their founded startups" ON mentor_founded_startups;

-- =====================================================
-- STEP 3: CREATE INSERT POLICIES
-- =====================================================
-- Mentors can insert their own assignments
CREATE POLICY "Mentors can insert their assignments" 
ON mentor_startup_assignments
FOR INSERT 
WITH CHECK (mentor_id = auth.uid());

-- Mentors can insert their own founded startups
CREATE POLICY "Mentors can insert their founded startups" 
ON mentor_founded_startups
FOR INSERT 
WITH CHECK (mentor_id = auth.uid());

-- =====================================================
-- STEP 4: CREATE UPDATE POLICIES
-- =====================================================
-- Mentors can update their own assignments
CREATE POLICY "Mentors can update their assignments" 
ON mentor_startup_assignments
FOR UPDATE 
USING (mentor_id = auth.uid())
WITH CHECK (mentor_id = auth.uid());

-- Mentors can update their own founded startups
CREATE POLICY "Mentors can update their founded startups" 
ON mentor_founded_startups
FOR UPDATE 
USING (mentor_id = auth.uid())
WITH CHECK (mentor_id = auth.uid());

-- =====================================================
-- STEP 5: CREATE DELETE POLICIES
-- =====================================================
-- Mentors can delete their own assignments
CREATE POLICY "Mentors can delete their assignments" 
ON mentor_startup_assignments
FOR DELETE 
USING (mentor_id = auth.uid());

-- Mentors can delete their own founded startups
CREATE POLICY "Mentors can delete their founded startups" 
ON mentor_founded_startups
FOR DELETE 
USING (mentor_id = auth.uid());

-- =====================================================
-- STEP 6: VERIFY POLICIES WERE CREATED
-- =====================================================
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
WHERE tablename IN ('mentor_startup_assignments', 'mentor_founded_startups')
ORDER BY tablename, policyname;

-- =====================================================
-- NOTES:
-- =====================================================
-- 1. The policies use auth.uid() to ensure mentors can only
--    modify their own data
-- 2. UPDATE policies have both USING and WITH CHECK clauses
--    to ensure data integrity
-- 3. If you still get 403 errors, check:
--    - auth.uid() is returning the correct user ID
--    - The mentor_id in the insert/update matches auth.uid()
--    - No conflicting policies exist
-- =====================================================



