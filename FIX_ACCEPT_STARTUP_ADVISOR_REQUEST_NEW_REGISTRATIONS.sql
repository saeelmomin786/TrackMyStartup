-- =====================================================
-- FIX accept_startup_advisor_request FOR NEW REGISTRATIONS
-- =====================================================
-- Issue: Function only checks/updates users table
--        New registrations are in user_profiles table
-- Fix: Add missing columns to user_profiles, then update function
-- =====================================================

-- =====================================================
-- FIX accept_startup_advisor_request FOR NEW REGISTRATIONS
-- =====================================================
-- Issue: Function only checks/updates users table
--        New registrations are in user_profiles table
-- Fix: Update function to handle both tables
-- Note: Columns already exist in both tables (verified)
-- =====================================================

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
    user_updated boolean := false;
    profile_updated boolean := false;
BEGIN
    -- Get the advisor's code from BOTH tables (new and old registrations)
    -- Try user_profiles first (new registrations)
    SELECT investment_advisor_code INTO advisor_code
    FROM user_profiles 
    WHERE auth_user_id = p_advisor_id AND role = 'Investment Advisor';
    
    -- If not found, try users table (old registrations)
    IF advisor_code IS NULL THEN
        SELECT investment_advisor_code INTO advisor_code
        FROM users 
        WHERE id = p_advisor_id AND role = 'Investment Advisor';
    END IF;
    
    -- Verify the advisor exists
    IF advisor_code IS NULL THEN
        RAISE EXCEPTION 'Investment Advisor not found or invalid';
    END IF;
    
    -- Update user_profiles table (new registrations)
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
    AND investment_advisor_code_entered = advisor_code;
    
    GET DIAGNOSTICS user_updated = ROW_COUNT;
    
    -- Also update users table (old registrations - for backward compatibility)
    UPDATE users 
    SET 
        advisor_accepted = true,
        advisor_accepted_date = NOW(),
        minimum_investment = CASE WHEN p_financial_matrix IS NOT NULL THEN (p_financial_matrix->>'minimum_investment')::decimal ELSE NULL END,
        maximum_investment = CASE WHEN p_financial_matrix IS NOT NULL THEN (p_financial_matrix->>'maximum_investment')::decimal ELSE NULL END,
        success_fee = CASE WHEN p_financial_matrix IS NOT NULL THEN (p_financial_matrix->>'success_fee')::decimal ELSE NULL END,
        success_fee_type = CASE WHEN p_financial_matrix IS NOT NULL THEN p_financial_matrix->>'success_fee_type' ELSE 'percentage' END,
        scouting_fee = CASE WHEN p_financial_matrix IS NOT NULL THEN (p_financial_matrix->>'scouting_fee')::decimal ELSE NULL END,
        updated_at = NOW()
    WHERE id = p_user_id 
    AND investment_advisor_code_entered = advisor_code;
    
    GET DIAGNOSTICS profile_updated = ROW_COUNT;
    
    -- Check if at least one update was successful
    IF NOT user_updated AND NOT profile_updated THEN
        RAISE EXCEPTION 'User not found or advisor code mismatch';
    END IF;
    
    -- Return the updated user data (try user_profiles first, then users)
    SELECT to_jsonb(up.*) INTO result
    FROM user_profiles up
    WHERE up.auth_user_id = p_user_id;
    
    -- If not found in user_profiles, try users table
    IF result IS NULL THEN
        SELECT to_jsonb(u.*) INTO result
        FROM users u
        WHERE u.id = p_user_id;
    END IF;
    
    RETURN result;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION accept_startup_advisor_request(uuid, uuid, jsonb) TO authenticated;

-- =====================================================
-- VERIFY FUNCTION
-- =====================================================
SELECT 
    '✅ Function updated successfully' as status,
    'Function now handles both user_profiles and users tables' as note_1,
    'Works for both new and old registrations' as note_2;

