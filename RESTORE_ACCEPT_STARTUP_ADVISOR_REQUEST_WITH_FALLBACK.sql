-- =====================================================
-- RESTORE accept_startup_advisor_request() WITH FALLBACK
-- =====================================================
-- CRITICAL FIX: The optimized version removed fallback to users table
-- This broke legacy registrations (users only in users table, not user_profiles)
-- Solution: Restore fallback logic while keeping it efficient
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
    user_exists boolean := false;
BEGIN
    -- STEP 1: Get advisor code from user_profiles (NEW registrations)
    SELECT COALESCE(up.investment_advisor_code, up.investment_advisor_code_entered) INTO advisor_code
    FROM user_profiles up
    WHERE up.auth_user_id = p_advisor_id 
    AND up.role = 'Investment Advisor'
    ORDER BY up.created_at DESC
    LIMIT 1;
    
    -- FALLBACK: If not found in user_profiles, try users table (LEGACY registrations)
    IF advisor_code IS NULL THEN
        SELECT investment_advisor_code INTO advisor_code
        FROM public.users
        WHERE id = p_advisor_id 
        AND role = 'Investment Advisor';
    END IF;
    
    -- Verify the advisor exists
    IF advisor_code IS NULL THEN
        RAISE EXCEPTION 'Investment Advisor not found or invalid';
    END IF;

    -- STEP 2: Try updating user_profiles first (NEW registrations)
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
    
    -- FALLBACK: If user_profiles update failed, try users table (LEGACY registrations)
    IF NOT profile_updated THEN
        UPDATE public.users
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
        AND (
            investment_advisor_code_entered = advisor_code
            OR investment_advisor_code = advisor_code
        );
        
        GET DIAGNOSTICS profile_updated = ROW_COUNT;
    END IF;
    
    -- Check if update was successful in either table
    IF NOT profile_updated THEN
        RAISE EXCEPTION 'User not found or advisor code mismatch';
    END IF;
    
    -- STEP 3: Return the updated user data
    -- Try user_profiles first (NEW registrations)
    SELECT to_jsonb(up.*) INTO result
    FROM user_profiles up
    WHERE up.auth_user_id = p_user_id
    ORDER BY up.created_at DESC
    LIMIT 1;
    
    -- FALLBACK: If not in user_profiles, return from users table (LEGACY)
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

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION accept_startup_advisor_request(uuid, uuid, jsonb) TO authenticated;

-- Verify the function was created
SELECT '✅ Function accept_startup_advisor_request() restored with fallback (user_profiles → users)' as status;
