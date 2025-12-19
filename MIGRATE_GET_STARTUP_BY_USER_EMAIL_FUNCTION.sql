-- =====================================================
-- MIGRATE get_startup_by_user_email() TO USE user_profiles
-- OPTIMIZED VERSION: NO FALLBACK (FASTER FOR LARGE USER BASE)
-- =====================================================
-- This function returns startup details by user email
-- Frontend Impact: ✅ Check if function is used - if used, signature stays same
-- 
-- Migration: Replace `users` table with `user_profiles` table
-- NO FALLBACKS - Only queries user_profiles table

DROP FUNCTION IF EXISTS get_startup_by_user_email(TEXT) CASCADE;

CREATE OR REPLACE FUNCTION get_startup_by_user_email(user_email TEXT)
RETURNS TABLE (
    startup_id INTEGER,
    startup_name TEXT,
    sector TEXT,
    current_valuation NUMERIC,
    total_funding NUMERIC,
    total_revenue NUMERIC,
    compliance_status TEXT,
    registration_date DATE
) AS $$
BEGIN
    -- MIGRATED: Join with user_profiles instead of users (get most recent profile)
    RETURN QUERY
    SELECT 
        s.id as startup_id,
        s.name as startup_name,
        s.sector,
        s.current_valuation,
        s.total_funding,
        s.total_revenue,
        s.compliance_status,
        s.registration_date
    FROM startups s
    INNER JOIN LATERAL (
        SELECT startup_name
        FROM user_profiles
        WHERE email = user_email 
        AND role = 'Startup'
        ORDER BY created_at DESC
        LIMIT 1
    ) up ON up.startup_name = s.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_startup_by_user_email(TEXT) TO authenticated;

-- Verify the function was created
SELECT '✅ Function get_startup_by_user_email() migrated to use user_profiles (NO FALLBACK - OPTIMIZED)' as status;


