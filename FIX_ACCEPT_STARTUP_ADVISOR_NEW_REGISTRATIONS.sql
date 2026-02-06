-- =====================================================
-- FIX accept_startup_advisor_request FOR NEW REGISTRATIONS
-- =====================================================
-- Issue: New registrations may not have investment_advisor_code_entered set
-- Fix: Allow acceptance even if code isn't entered yet; set it during acceptance
-- =====================================================

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
    -- STEP 1: Get advisor code and validate advisor exists
    SELECT COALESCE(up.investment_advisor_code, up.investment_advisor_code_entered) INTO advisor_code
    FROM user_profiles up
    WHERE up.auth_user_id = p_advisor_id 
    AND up.role = 'Investment Advisor'
    ORDER BY up.created_at DESC
    LIMIT 1;
    
    -- FALLBACK: Try users table (legacy)
    IF advisor_code IS NULL THEN
        SELECT investment_advisor_code INTO advisor_code
        FROM public.users
        WHERE id = p_advisor_id 
        AND role = 'Investment Advisor';
    END IF;
    
    IF advisor_code IS NULL THEN
        RAISE EXCEPTION 'Investment Advisor not found or invalid';
    END IF;

    -- STEP 2: Update user_profiles (NEW registrations)
    -- Allow acceptance even if investment_advisor_code_entered is NULL
    -- This handles new registrations that haven't entered the code yet
    UPDATE user_profiles 
    SET 
        advisor_accepted = true,
        advisor_accepted_date = NOW(),
        investment_advisor_code_entered = COALESCE(investment_advisor_code_entered, advisor_code),
        minimum_investment = CASE WHEN p_financial_matrix IS NOT NULL THEN (p_financial_matrix->>'minimum_investment')::decimal ELSE NULL END,
        maximum_investment = CASE WHEN p_financial_matrix IS NOT NULL THEN (p_financial_matrix->>'maximum_investment')::decimal ELSE NULL END,
        success_fee = CASE WHEN p_financial_matrix IS NOT NULL THEN (p_financial_matrix->>'success_fee')::decimal ELSE NULL END,
        success_fee_type = CASE WHEN p_financial_matrix IS NOT NULL THEN p_financial_matrix->>'success_fee_type' ELSE 'percentage' END,
        scouting_fee = CASE WHEN p_financial_matrix IS NOT NULL THEN (p_financial_matrix->>'scouting_fee')::decimal ELSE NULL END,
        updated_at = NOW()
    WHERE auth_user_id = p_user_id;
    
    GET DIAGNOSTICS profile_updated = ROW_COUNT;
    
    -- FALLBACK: If not in user_profiles, try users table (LEGACY)
    IF NOT profile_updated THEN
        UPDATE public.users
        SET 
            advisor_accepted = true,
            advisor_accepted_date = NOW(),
            investment_advisor_code_entered = COALESCE(investment_advisor_code_entered, advisor_code),
            minimum_investment = CASE WHEN p_financial_matrix IS NOT NULL THEN (p_financial_matrix->>'minimum_investment')::decimal ELSE NULL END,
            maximum_investment = CASE WHEN p_financial_matrix IS NOT NULL THEN (p_financial_matrix->>'maximum_investment')::decimal ELSE NULL END,
            success_fee = CASE WHEN p_financial_matrix IS NOT NULL THEN (p_financial_matrix->>'success_fee')::decimal ELSE NULL END,
            success_fee_type = CASE WHEN p_financial_matrix IS NOT NULL THEN p_financial_matrix->>'success_fee_type' ELSE 'percentage' END,
            scouting_fee = CASE WHEN p_financial_matrix IS NOT NULL THEN (p_financial_matrix->>'scouting_fee')::decimal ELSE NULL END,
            updated_at = NOW()
        WHERE id = p_user_id;
        
        GET DIAGNOSTICS profile_updated = ROW_COUNT;
    END IF;
    
    -- Check if update was successful in either table
    IF NOT profile_updated THEN
        RAISE EXCEPTION 'User not found';
    END IF;
    
    -- STEP 3: Return the updated user data
    -- Try user_profiles first
    SELECT to_jsonb(up.*) INTO result
    FROM user_profiles up
    WHERE up.auth_user_id = p_user_id
    ORDER BY up.created_at DESC
    LIMIT 1;
    
    -- FALLBACK: If not in user_profiles, return from users table
    IF result IS NULL THEN
        SELECT to_jsonb(u.*) INTO result
        FROM public.users u
        WHERE u.id = p_user_id;
    END IF;
    
    IF result IS NULL THEN
        RAISE EXCEPTION 'User profile not found after update';
    END IF;
    
    RETURN result;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION accept_startup_advisor_request(uuid, uuid, jsonb) TO authenticated;

-- Verify
SELECT '✅ Function accept_startup_advisor_request() fixed for new registrations (no code match required)' as status;
