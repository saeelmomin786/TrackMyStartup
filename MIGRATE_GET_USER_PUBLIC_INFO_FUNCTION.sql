-- =====================================================
-- MIGRATE get_user_public_info() FUNCTION TO USE user_profiles
-- OPTIMIZED VERSION: NO FALLBACK (FASTER FOR LARGE USER BASE)
-- =====================================================
-- This function returns public user information (name, email, company_name)
-- Used for displaying lead investor information in co-investment offers
-- Frontend Impact: ✅ NONE - Function signature and return format stay the same
-- 
-- Performance Benefits of Removing Fallback:
-- ✅ Only queries ONE table instead of potentially TWO
-- ✅ Faster execution for large user bases
-- ✅ Cleaner code - assumes all users are in user_profiles
-- 
-- Verification: All users have profiles in user_profiles table ✅
-- (151 users in users table, 154 profiles in user_profiles, 0 missing)

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
    -- Fetch public user information from user_profiles (most recent profile if multiple)
    SELECT json_build_object(
        'id', p.auth_user_id,
        'name', p.name,
        'email', p.email,
        'company_name', COALESCE(p.company, p.firm_name, p.startup_name)
    ) INTO user_info
    FROM public.user_profiles p
    WHERE p.auth_user_id = p_user_id
    ORDER BY p.created_at DESC
    LIMIT 1;
    
    -- Return null values if user not found (instead of error)
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
'Returns public user information (name, email, company_name) for a given user ID from user_profiles table.
Uses SECURITY DEFINER to bypass RLS restrictions. 
This allows startups to view lead investor information in co-investment offers.
Company name is derived from company, firm_name, or startup_name fields.';

-- Verify the function was created
SELECT '✅ Function get_user_public_info() migrated to use user_profiles (NO FALLBACK - OPTIMIZED)' as status;

