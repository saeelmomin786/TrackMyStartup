-- =====================================================
-- ADD MENTOR ROLE TO RLS POLICIES
-- =====================================================
-- This script updates existing RLS policies to include 'Mentor' role
-- Run this AFTER running ADD_MENTOR_ROLE_MIGRATION.sql
-- 
-- IMPORTANT: Review each policy to ensure Mentor should have access
-- Some policies may need Mentor-specific permissions

-- =====================================================
-- STEP 1: UPDATE HELPER FUNCTIONS
-- =====================================================

-- Update is_ca_or_cs to include Mentor (if mentors should have similar access)
-- Or create a separate function for mentors
CREATE OR REPLACE FUNCTION is_mentor_or_advisor()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN get_user_role() IN ('Mentor', 'Investment Advisor');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- STEP 2: UPDATE STARTUPS TABLE POLICIES
-- =====================================================

-- Check existing policies on startups table
SELECT 'Current startups policies:' as info;
SELECT policyname, cmd, qual 
FROM pg_policies 
WHERE tablename = 'startups' 
AND schemaname = 'public';

-- Example: Update a policy to include Mentor
-- (Adjust based on your specific needs - mentors might need read-only access)
-- 
-- DROP POLICY IF EXISTS "policy_name" ON public.startups;
-- CREATE POLICY "policy_name" ON public.startups
--     FOR SELECT USING (
--         EXISTS (
--             SELECT 1 FROM public.users 
--             WHERE id = auth.uid() 
--             AND role IN ('CA', 'CS', 'Mentor')
--         )
--     );

-- =====================================================
-- STEP 3: UPDATE USERS TABLE POLICIES
-- =====================================================

-- Mentors typically need to view user profiles they're mentoring
-- Update policies as needed based on your requirements

-- =====================================================
-- STEP 4: UPDATE INVESTMENT_OFFERS POLICIES
-- =====================================================

-- If mentors should see investment offers for their startups/investors
-- Update policies accordingly

-- =====================================================
-- STEP 5: CREATE MENTOR-SPECIFIC POLICIES (if needed)
-- =====================================================

-- Example: Allow mentors to view startups they're assigned to
-- CREATE POLICY "Mentors can view assigned startups" ON public.startups
--     FOR SELECT USING (
--         EXISTS (
--             SELECT 1 FROM public.users 
--             WHERE id = auth.uid() 
--             AND role = 'Mentor'
--         )
--         -- Add condition for mentor-startup assignment if you have that table
--     );

-- =====================================================
-- STEP 6: UPDATE STORAGE POLICIES (if needed)
-- =====================================================

-- If mentors need access to storage buckets, update those policies too
-- See COMPREHENSIVE_STORAGE_POLICIES.sql for reference

-- =====================================================
-- NOTES:
-- =====================================================
-- 1. Review each policy carefully before updating
-- 2. Consider creating a mentor_startup_assignments table to track relationships
-- 3. Consider creating a mentor_investor_assignments table
-- 4. Test policies thoroughly in a development environment first
-- 5. Some policies may need Mentor-specific logic, not just adding to IN clause
-- =====================================================

