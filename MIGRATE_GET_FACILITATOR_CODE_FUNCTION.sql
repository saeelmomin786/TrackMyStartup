-- =====================================================
-- MIGRATE get_facilitator_code() TO USE user_profiles
-- OPTIMIZED VERSION: NO FALLBACK (FASTER FOR LARGE USER BASE)
-- =====================================================
-- This function returns the facilitator code for a user
-- Frontend Impact: ✅ Check if function is used - if used, signature stays same
-- 
-- Migration: Replace ALL `users` table references with `user_profiles`
-- NO FALLBACKS - Only queries user_profiles table

DROP FUNCTION IF EXISTS public.get_facilitator_code(uuid) CASCADE;

CREATE OR REPLACE FUNCTION public.get_facilitator_code(p_user_id uuid)
RETURNS character varying
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    code VARCHAR(10);
BEGIN
    -- MIGRATED: Get facilitator code from user_profiles (get most recent profile)
    SELECT up.facilitator_code INTO code
    FROM public.user_profiles up
    WHERE up.auth_user_id = p_user_id
    ORDER BY up.created_at DESC
    LIMIT 1;
    
    RETURN code;
END;
$function$;

-- Grant execute permission (if needed)
-- GRANT EXECUTE ON FUNCTION public.get_facilitator_code(uuid) TO authenticated;
-- GRANT EXECUTE ON FUNCTION public.get_facilitator_code(uuid) TO anon;

-- Verify the function was created
SELECT '✅ Function get_facilitator_code() migrated to use user_profiles (NO FALLBACK - OPTIMIZED)' as status;



