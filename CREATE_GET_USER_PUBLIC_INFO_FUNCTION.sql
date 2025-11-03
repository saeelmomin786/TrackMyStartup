-- CREATE_GET_USER_PUBLIC_INFO_FUNCTION.sql
-- This script creates the RPC function needed to fetch lead investor information
-- This function bypasses RLS to allow startups to view public investor information

-- Drop the function if it exists (for idempotency)
DROP FUNCTION IF EXISTS public.get_user_public_info(UUID);

-- Create the function
CREATE OR REPLACE FUNCTION public.get_user_public_info(p_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    user_info JSON;
BEGIN
    -- Fetch public user information
    SELECT json_build_object(
        'id', id,
        'name', name,
        'email', email,
        'company_name', company_name
    ) INTO user_info
    FROM public.users
    WHERE id = p_user_id;
    
    -- Return null if user not found (instead of error)
    RETURN COALESCE(user_info, json_build_object(
        'id', NULL,
        'name', NULL,
        'email', NULL,
        'company_name', NULL
    ));
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_user_public_info(UUID) TO authenticated;

-- Grant execute permission to anon (if needed for some scenarios)
GRANT EXECUTE ON FUNCTION public.get_user_public_info(UUID) TO anon;

-- Add a comment to document the function
COMMENT ON FUNCTION public.get_user_public_info(UUID) IS 
'Returns public user information (name, email, company_name) for a given user ID. 
Uses SECURITY DEFINER to bypass RLS restrictions. 
This allows startups to view lead investor information in co-investment offers.';









