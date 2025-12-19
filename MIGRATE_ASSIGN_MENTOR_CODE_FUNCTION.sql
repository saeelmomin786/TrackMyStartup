-- =====================================================
-- MIGRATE assign_mentor_code() TO USE user_profiles
-- OPTIMIZED VERSION: NO FALLBACK (FASTER FOR LARGE USER BASE)
-- =====================================================
-- This function assigns a mentor code to a user
-- Frontend Impact: ✅ Check if function is used - if used, signature stays same
-- 
-- Migration: Replace ALL `users` table references with `user_profiles`
-- NO FALLBACKS - Only queries and updates user_profiles table

DROP FUNCTION IF EXISTS public.assign_mentor_code(uuid) CASCADE;

CREATE OR REPLACE FUNCTION public.assign_mentor_code(p_user_id uuid)
RETURNS character varying
LANGUAGE plpgsql
AS $function$
DECLARE
    new_code VARCHAR(10);
    user_role TEXT;
    profile_id UUID;
BEGIN
    -- MIGRATED: Check if user is a mentor from user_profiles (get most recent profile)
    SELECT up.role, up.id
    INTO user_role, profile_id
    FROM public.user_profiles up
    WHERE up.auth_user_id = p_user_id
    AND up.role = 'Mentor'
    ORDER BY up.created_at DESC
    LIMIT 1;
    
    IF user_role IS NULL OR user_role != 'Mentor' THEN
        RAISE EXCEPTION 'User is not a Mentor';
    END IF;
    
    -- MIGRATED: Check if user already has a code from user_profiles
    IF EXISTS (
        SELECT 1 
        FROM public.user_profiles 
        WHERE auth_user_id = p_user_id 
        AND role = 'Mentor'
        AND mentor_code IS NOT NULL
    ) THEN
        SELECT mentor_code INTO new_code 
        FROM public.user_profiles 
        WHERE auth_user_id = p_user_id 
        AND role = 'Mentor'
        AND mentor_code IS NOT NULL
        ORDER BY created_at DESC
        LIMIT 1;
        RETURN new_code;
    END IF;
    
    -- Generate and assign new code
    new_code := generate_mentor_code();
    
    -- MIGRATED: Update user_profiles instead of users (update most recent profile)
    UPDATE public.user_profiles 
    SET mentor_code = new_code,
        updated_at = NOW()
    WHERE auth_user_id = p_user_id 
    AND role = 'Mentor'
    AND id = (
        SELECT id 
        FROM public.user_profiles 
        WHERE auth_user_id = p_user_id 
        AND role = 'Mentor'
        ORDER BY created_at DESC
        LIMIT 1
    );
    
    RETURN new_code;
END;
$function$;

-- Grant execute permission (if needed)
-- GRANT EXECUTE ON FUNCTION public.assign_mentor_code(uuid) TO authenticated;

-- Verify the function was created
SELECT '✅ Function assign_mentor_code() migrated to use user_profiles (NO FALLBACK - OPTIMIZED)' as status;


