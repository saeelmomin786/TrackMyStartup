-- CREATE_CHECK_EMAIL_EXISTS_FUNCTION.sql
-- Create a database function to check if email exists in user_profiles
-- This function uses SECURITY DEFINER to bypass RLS, allowing anonymous users to check email existence
-- This is better than using an API endpoint because it's faster and doesn't require an extra network call

-- Drop function if exists
DROP FUNCTION IF EXISTS check_email_exists(TEXT);

-- Create function to check if email exists
CREATE OR REPLACE FUNCTION check_email_exists(email_to_check TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    email_exists BOOLEAN;
BEGIN
    -- Check if email exists in user_profiles table
    SELECT EXISTS(
        SELECT 1 
        FROM public.user_profiles 
        WHERE email = LOWER(TRIM(email_to_check))
    ) INTO email_exists;
    
    RETURN email_exists;
END;
$$;

-- Grant execute permission to anonymous and authenticated users
GRANT EXECUTE ON FUNCTION check_email_exists(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION check_email_exists(TEXT) TO authenticated;

-- Add comment
COMMENT ON FUNCTION check_email_exists(TEXT) IS 'Checks if an email exists in user_profiles table. Bypasses RLS using SECURITY DEFINER, allowing anonymous users to check email availability during registration.';

