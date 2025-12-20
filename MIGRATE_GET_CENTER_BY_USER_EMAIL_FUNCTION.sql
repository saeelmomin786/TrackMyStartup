-- =====================================================
-- MIGRATE get_center_by_user_email() TO USE user_profiles
-- OPTIMIZED VERSION: NO FALLBACK (FASTER FOR LARGE USER BASE)
-- =====================================================
-- This function returns facilitation center details by user email
-- Frontend Impact: ✅ Check if function is used - if used, signature stays same
-- 
-- Migration: Replace ALL `users` table references with `user_profiles`
-- NO FALLBACKS - Only queries user_profiles table

DROP FUNCTION IF EXISTS get_center_by_user_email(TEXT) CASCADE;

CREATE OR REPLACE FUNCTION get_center_by_user_email(user_email TEXT)
RETURNS TABLE (
    user_id TEXT,
    center_name TEXT,
    user_name TEXT,
    email TEXT,
    registration_date DATE
) AS $$
BEGIN
    -- MIGRATED: Get from user_profiles (most recent profile if multiple)
    RETURN QUERY
    SELECT 
        up.auth_user_id::TEXT,
        up.center_name,
        up.name,
        up.email,
        up.registration_date::DATE
    FROM user_profiles up
    WHERE up.email = user_email 
    AND up.role = 'Startup Facilitation Center'
    ORDER BY up.created_at DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_center_by_user_email(TEXT) TO authenticated, anon;

-- Verify the function was created
SELECT '✅ Function get_center_by_user_email() migrated to use user_profiles (NO FALLBACK - OPTIMIZED)' as status;



