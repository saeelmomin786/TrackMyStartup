-- =====================================================
-- CREATE FUNCTION TO GET MENTOR EMAIL (NO RLS CHANGE NEEDED)
-- =====================================================
-- This function uses SECURITY DEFINER to bypass RLS
-- It only returns the email (not sensitive data)
-- Safe alternative to changing RLS policies
-- =====================================================

-- Drop function if exists
DROP FUNCTION IF EXISTS get_mentor_email_for_calendar(uuid) CASCADE;

-- Create function to get mentor email
-- SECURITY DEFINER allows it to bypass RLS
CREATE OR REPLACE FUNCTION get_mentor_email_for_calendar(mentor_auth_user_id uuid)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    mentor_email TEXT;
BEGIN
    -- Get email from user_profiles for the mentor
    -- Prefer Mentor role profile, but fallback to any profile if needed
    SELECT email INTO mentor_email
    FROM user_profiles
    WHERE auth_user_id = mentor_auth_user_id
    ORDER BY 
        CASE WHEN role = 'Mentor' THEN 1 ELSE 2 END,  -- Prefer Mentor role
        created_at DESC  -- Get most recent if multiple
    LIMIT 1;
    
    RETURN mentor_email;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_mentor_email_for_calendar(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_mentor_email_for_calendar(uuid) TO anon;

-- Verify the function was created
SELECT '✅ Function get_mentor_email_for_calendar() created successfully' as status;

-- Test the function (replace with actual mentor auth_user_id)
-- SELECT get_mentor_email_for_calendar('4e5c19f3-d1ab-4409-b688-1a4029f9a65c'::uuid);

