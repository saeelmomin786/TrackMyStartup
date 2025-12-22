-- =====================================================
-- MIGRATE get_facilitator_by_code() TO USE user_profiles
-- OPTIMIZED VERSION: NO FALLBACK (FASTER FOR LARGE USER BASE)
-- =====================================================
-- This function returns the facilitator user ID by facilitator code
-- Frontend Impact: ✅ Check if function is used - if used, signature stays same
-- 
-- Migration: Replace ALL `users` table references with `user_profiles`
-- NO FALLBACKS - Only queries user_profiles table

DROP FUNCTION IF EXISTS public.get_facilitator_by_code(character varying) CASCADE;

CREATE OR REPLACE FUNCTION public.get_facilitator_by_code(p_code character varying)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    facilitator_id UUID;
BEGIN
    -- MIGRATED: Get facilitator auth_user_id from user_profiles (get most recent profile)
    SELECT up.auth_user_id INTO facilitator_id
    FROM public.user_profiles up
    WHERE up.facilitator_code = p_code 
    AND up.role = 'Startup Facilitation Center'
    ORDER BY up.created_at DESC
    LIMIT 1;
    
    RETURN facilitator_id;
END;
$function$;

-- Grant execute permission (if needed)
-- GRANT EXECUTE ON FUNCTION public.get_facilitator_by_code(character varying) TO authenticated;
-- GRANT EXECUTE ON FUNCTION public.get_facilitator_by_code(character varying) TO anon;

-- Verify the function was created
SELECT '✅ Function get_facilitator_by_code() migrated to use user_profiles (NO FALLBACK - OPTIMIZED)' as status;







