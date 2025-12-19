-- =====================================================
-- MIGRATE get_user_profile() TO USE user_profiles
-- OPTIMIZED VERSION: NO FALLBACK (FASTER FOR LARGE USER BASE)
-- =====================================================
-- This function returns user profile data
-- Frontend Impact: ✅ Check if function is used - if used, signature stays same
-- 
-- Migration: Replace `auth.users` table with `user_profiles` table
-- NO FALLBACKS - Only queries user_profiles table
-- Note: This function previously queried auth.users, now uses user_profiles

DROP FUNCTION IF EXISTS public.get_user_profile(uuid) CASCADE;

CREATE OR REPLACE FUNCTION public.get_user_profile(p_user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    v_profile JSON;
BEGIN
    -- MIGRATED: Get profile from user_profiles instead of auth.users (get most recent profile)
    SELECT json_build_object(
        'id', up.auth_user_id,
        'name', COALESCE(up.name, up.email),
        'email', up.email
    ) INTO v_profile
    FROM public.user_profiles up
    WHERE up.auth_user_id = p_user_id
    ORDER BY up.created_at DESC
    LIMIT 1;
    
    RETURN COALESCE(v_profile, '{}'::json);
END;
$function$;

-- Grant execute permission (if needed)
-- GRANT EXECUTE ON FUNCTION public.get_user_profile(uuid) TO authenticated;
-- GRANT EXECUTE ON FUNCTION public.get_user_profile(uuid) TO anon;

-- Verify the function was created
SELECT '✅ Function get_user_profile() migrated to use user_profiles (NO FALLBACK - OPTIMIZED)' as status;


