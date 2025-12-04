-- =====================================================
-- SAFE: ADD MENTOR HELPER FUNCTION ONLY
-- =====================================================
-- This script is 100% SAFE for live systems
-- It ONLY creates a new helper function
-- It does NOT modify any existing RLS policies
-- =====================================================

-- Step 1: Create helper function for Mentor role check
-- This is SAFE - it only adds a new function, doesn't modify anything
CREATE OR REPLACE FUNCTION is_mentor()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN get_user_role() = 'Mentor';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 2: Create helper function for Mentor or Investment Advisor
-- This is SAFE - it only adds a new function, doesn't modify anything
CREATE OR REPLACE FUNCTION is_mentor_or_advisor()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN get_user_role() IN ('Mentor', 'Investment Advisor');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 3: Verify functions were created
SELECT '✅ Helper functions created successfully' as status;
SELECT 
    routine_name,
    routine_type,
    'Function exists and is ready to use' as status
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN ('is_mentor', 'is_mentor_or_advisor')
ORDER BY routine_name;

-- =====================================================
-- ✅ THIS SCRIPT IS 100% SAFE
-- =====================================================
-- It only creates NEW helper functions
-- It does NOT:
--   - Drop any existing policies
--   - Modify any existing policies
--   - Create any new policies
--   - Affect any existing functionality
-- =====================================================
-- 
-- NEXT STEPS (Manual - Review before running):
-- 1. Review your existing RLS policies
-- 2. Decide which policies should include Mentor
-- 3. Manually update policies one by one
-- 4. Test each policy change in development first
-- =====================================================

