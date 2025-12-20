-- =====================================================
-- MIGRATE get_user_role() FUNCTION TO USE user_profiles
-- OPTIMIZED VERSION: NO FALLBACK (FASTER FOR LARGE USER BASE)
-- =====================================================
-- This function is used in storage policies and other helper functions
-- Frontend Impact: ✅ NONE - Function signature stays the same
-- 
-- Performance Benefits of Removing Fallback:
-- ✅ Only queries ONE table instead of potentially TWO
-- ✅ Faster execution for large user bases
-- ✅ Cleaner code - assumes all users are in user_profiles
-- 
-- IMPORTANT: Only use this if ALL users have been migrated to user_profiles table
-- If you still have old users in the users table, use MIGRATE_GET_USER_ROLE_FUNCTION.sql instead

CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
DECLARE
    user_role_value TEXT;
BEGIN
    -- Get role from user_profiles (most recent profile if user has multiple)
    SELECT role::TEXT INTO user_role_value
    FROM public.user_profiles
    WHERE auth_user_id = auth.uid()
    ORDER BY created_at DESC
    LIMIT 1;
    
    RETURN user_role_value;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission (if needed)
GRANT EXECUTE ON FUNCTION get_user_role() TO authenticated, anon;

-- Verify the function was created
SELECT '✅ Function get_user_role() migrated to use user_profiles (NO FALLBACK - OPTIMIZED)' as status;

-- Performance note:
-- This version is FASTER because:
-- 1. Only queries ONE table (user_profiles) instead of potentially TWO
-- 2. No conditional logic (IF statement) - simpler execution path
-- 3. Better for large user bases - single index lookup



