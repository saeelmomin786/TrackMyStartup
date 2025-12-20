-- =====================================================
-- MIGRATE get_advisor_investors() TO USE user_profiles
-- OPTIMIZED VERSION: NO FALLBACK (FASTER FOR LARGE USER BASE)
-- =====================================================
-- This function returns investors for an advisor (simpler version than get_advisor_clients)
-- Frontend Impact: ✅ Check if function is used - if used, signature stays same
-- 
-- Migration: Replace ALL `users` table references with `user_profiles`
-- NO FALLBACKS - Only queries user_profiles table

DROP FUNCTION IF EXISTS get_advisor_investors(uuid) CASCADE;

CREATE OR REPLACE FUNCTION get_advisor_investors(advisor_id uuid)
RETURNS TABLE(
    user_id uuid,
    user_name text,
    user_email text,
    user_role text,
    investment_advisor_code_entered text,
    advisor_accepted boolean
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    advisor_code text;
BEGIN
    -- MIGRATED: Get the advisor's code from user_profiles (most recent profile)
    SELECT COALESCE(up.investment_advisor_code, up.investment_advisor_code_entered) INTO advisor_code
    FROM user_profiles up
    WHERE up.auth_user_id = advisor_id 
    AND up.role = 'Investment Advisor'
    ORDER BY up.created_at DESC
    LIMIT 1;
    
    -- If advisor code not found, return empty result
    IF advisor_code IS NULL THEN
        RETURN;
    END IF;
    
    -- MIGRATED: Return all investor profiles who entered this advisor's code
    RETURN QUERY
    SELECT 
        up.auth_user_id as user_id,
        up.name as user_name,
        up.email as user_email,
        up.role::text as user_role,
        up.investment_advisor_code_entered,
        up.advisor_accepted
    FROM user_profiles up
    WHERE up.role = 'Investor'
    AND (
        up.investment_advisor_code_entered = advisor_code
        OR up.investment_advisor_code = advisor_code
    )
    ORDER BY up.created_at DESC;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_advisor_investors(uuid) TO authenticated;

-- Verify the function was created
SELECT '✅ Function get_advisor_investors() migrated to use user_profiles (NO FALLBACK - OPTIMIZED)' as status;



