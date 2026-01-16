-- Create RPC function to reject advisor requests
-- This function bypasses RLS (Row Level Security) using SECURITY DEFINER
-- Similar to accept_startup_advisor_request but for rejection

CREATE OR REPLACE FUNCTION reject_startup_advisor_request(
    p_user_id uuid,
    p_advisor_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result jsonb;
    advisor_code text;
    users_updated boolean := false;
    profiles_updated boolean := false;
BEGIN
    -- Get the advisor's code
    SELECT investment_advisor_code INTO advisor_code
    FROM users 
    WHERE id = p_advisor_id AND role = 'Investment Advisor';
    
    -- Verify the advisor exists
    IF advisor_code IS NULL THEN
        RAISE EXCEPTION 'Investment Advisor not found or invalid';
    END IF;
    
    -- Update legacy `users` table (old registrations)
    UPDATE users 
    SET 
        advisor_accepted = false,
        advisor_accepted_date = NOW(),
        updated_at = NOW()
    WHERE id = p_user_id 
    AND investment_advisor_code_entered = advisor_code;
    
    IF FOUND THEN
        users_updated := true;
    END IF;
    
    -- Update `user_profiles` table (new registrations)
    UPDATE user_profiles
    SET 
        advisor_accepted = false,
        advisor_accepted_date = NOW(),
        updated_at = NOW()
    WHERE auth_user_id = p_user_id
    AND investment_advisor_code_entered = advisor_code;
    
    IF FOUND THEN
        profiles_updated := true;
    END IF;
    
    -- Check if at least one update succeeded
    IF NOT users_updated AND NOT profiles_updated THEN
        RAISE EXCEPTION 'User not found or advisor code mismatch in both users and user_profiles tables';
    END IF;
    
    -- Return success result
    result := jsonb_build_object(
        'success', true,
        'users_updated', users_updated,
        'profiles_updated', profiles_updated,
        'user_id', p_user_id,
        'advisor_id', p_advisor_id
    );
    
    RETURN result;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION reject_startup_advisor_request(uuid, uuid) TO authenticated;

-- Add comment
COMMENT ON FUNCTION reject_startup_advisor_request IS 'Rejects an advisor request by setting advisor_accepted to false. Updates both users and user_profiles tables if the user exists in either.';
