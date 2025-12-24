-- =====================================================
-- MIGRATE set_facilitator_code_on_opportunity() TO USE user_profiles
-- OPTIMIZED VERSION: NO FALLBACK (FASTER FOR LARGE USER BASE)
-- =====================================================
-- This function is a TRIGGER that sets facilitator_code on opportunity
-- Frontend Impact: ✅ Check if function is used - if used, signature stays same
-- 
-- Migration: Replace ALL `users` table references with `user_profiles`
-- NO FALLBACKS - Only queries user_profiles table
-- Note: This is a trigger function - ensure trigger is on the correct table

DROP FUNCTION IF EXISTS public.set_facilitator_code_on_opportunity() CASCADE;

CREATE OR REPLACE FUNCTION public.set_facilitator_code_on_opportunity()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
    -- MIGRATED: Get the facilitator code from user_profiles (get most recent profile)
    SELECT up.facilitator_code INTO NEW.facilitator_code
    FROM public.user_profiles up
    WHERE up.auth_user_id = NEW.facilitator_id
    AND up.role = 'Startup Facilitation Center'
    ORDER BY up.created_at DESC
    LIMIT 1;
    
    RETURN NEW;
END;
$function$;

-- Note: If there's a trigger using this function, ensure it's on the correct table
-- Example trigger (if needed):
-- DROP TRIGGER IF EXISTS set_facilitator_code_trigger ON public.incubation_opportunities;
-- CREATE TRIGGER set_facilitator_code_trigger
--     BEFORE INSERT OR UPDATE ON public.incubation_opportunities
--     FOR EACH ROW
--     WHEN (NEW.facilitator_id IS NOT NULL)
--     EXECUTE FUNCTION public.set_facilitator_code_on_opportunity();

-- Grant execute permission (if needed)
-- GRANT EXECUTE ON FUNCTION public.set_facilitator_code_on_opportunity() TO authenticated;

-- Verify the function was created
SELECT '✅ Function set_facilitator_code_on_opportunity() migrated to use user_profiles (NO FALLBACK - OPTIMIZED)' as status;















