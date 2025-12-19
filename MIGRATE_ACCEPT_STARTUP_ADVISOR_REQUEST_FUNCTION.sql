-- =====================================================
-- MIGRATE accept_startup_advisor_request() TO USE user_profiles ONLY
-- OPTIMIZED VERSION: NO FALLBACK (FASTER FOR LARGE USER BASE)
-- =====================================================
-- This function accepts a startup advisor request
-- Frontend Impact: ✅ Check if function is used - if used, signature stays same
-- 
-- Migration: Remove ALL fallback to users table, use user_profiles only
-- NO FALLBACKS - Only queries and updates user_profiles table

DROP FUNCTION IF EXISTS accept_startup_advisor_request(uuid, uuid, jsonb) CASCADE;

CREATE OR REPLACE FUNCTION accept_startup_advisor_request(
    p_user_id uuid,
    p_advisor_id uuid,
    p_financial_matrix jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result jsonb;
    advisor_code text;
    profile_updated boolean := false;
BEGIN
    -- MIGRATED: Get the advisor's code from user_profiles ONLY (most recent profile)
    SELECT COALESCE(up.investment_advisor_code, up.investment_advisor_code_entered) INTO advisor_code
    FROM user_profiles up
    WHERE up.auth_user_id = p_advisor_id 
    AND up.role = 'Investment Advisor'
    ORDER BY up.created_at DESC
    LIMIT 1;
    
    -- Verify the advisor exists
    IF advisor_code IS NULL THEN
        RAISE EXCEPTION 'Investment Advisor not found or invalid';
    END IF;
    
    -- MIGRATED: Update user_profiles table ONLY (no fallback to users table)
    UPDATE user_profiles 
    SET 
        advisor_accepted = true,
        advisor_accepted_date = NOW(),
        minimum_investment = CASE WHEN p_financial_matrix IS NOT NULL THEN (p_financial_matrix->>'minimum_investment')::decimal ELSE NULL END,
        maximum_investment = CASE WHEN p_financial_matrix IS NOT NULL THEN (p_financial_matrix->>'maximum_investment')::decimal ELSE NULL END,
        success_fee = CASE WHEN p_financial_matrix IS NOT NULL THEN (p_financial_matrix->>'success_fee')::decimal ELSE NULL END,
        success_fee_type = CASE WHEN p_financial_matrix IS NOT NULL THEN p_financial_matrix->>'success_fee_type' ELSE 'percentage' END,
        scouting_fee = CASE WHEN p_financial_matrix IS NOT NULL THEN (p_financial_matrix->>'scouting_fee')::decimal ELSE NULL END,
        updated_at = NOW()
    WHERE auth_user_id = p_user_id 
    AND (
        investment_advisor_code_entered = advisor_code
        OR investment_advisor_code = advisor_code
    );
    
    GET DIAGNOSTICS profile_updated = ROW_COUNT;
    
    -- Check if update was successful
    IF NOT profile_updated THEN
        RAISE EXCEPTION 'User not found or advisor code mismatch';
    END IF;
    
    -- MIGRATED: Return the updated user data from user_profiles ONLY (no fallback)
    SELECT to_jsonb(up.*) INTO result
    FROM user_profiles up
    WHERE up.auth_user_id = p_user_id
    ORDER BY up.created_at DESC
    LIMIT 1;
    
    IF result IS NULL THEN
        RAISE EXCEPTION 'User profile not found after update';
    END IF;
    
    RETURN result;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION accept_startup_advisor_request(uuid, uuid, jsonb) TO authenticated;

-- Verify the function was created
SELECT '✅ Function accept_startup_advisor_request() migrated to use user_profiles only (NO FALLBACK - OPTIMIZED)' as status;

