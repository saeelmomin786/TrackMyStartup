-- =====================================================
-- MIGRATE assign_evaluators_to_application() TO USE user_profiles
-- OPTIMIZED VERSION: NO FALLBACK (FASTER FOR LARGE USER BASE)
-- =====================================================
-- This function assigns evaluators to an application (only facilitators can do this)
-- Frontend Impact: ✅ Check if function is used - if used, signature stays same
-- 
-- Migration: Replace ALL `users` table references with `user_profiles`
-- NO FALLBACKS - Only queries user_profiles table

DROP FUNCTION IF EXISTS public.assign_evaluators_to_application(uuid, uuid, uuid[]) CASCADE;

CREATE OR REPLACE FUNCTION public.assign_evaluators_to_application(
    p_application_id uuid, 
    p_round_id uuid, 
    p_evaluator_ids uuid[]
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    evaluator_id UUID;
BEGIN
    -- MIGRATED: Validate that the user is a facilitator from user_profiles (get most recent profile)
    IF NOT EXISTS (
        SELECT 1 FROM public.user_profiles 
        WHERE auth_user_id = auth.uid() 
        AND role = 'Startup Facilitation Center'
        ORDER BY created_at DESC
        LIMIT 1
    ) THEN
        RAISE EXCEPTION 'Only facilitators can assign evaluators';
    END IF;

    -- Assign each evaluator to the application
    FOREACH evaluator_id IN ARRAY p_evaluator_ids
    LOOP
        INSERT INTO evaluator_assignments (application_id, round_id, evaluator_id, assigned_by)
        VALUES (p_application_id, p_round_id, evaluator_id, auth.uid())
        ON CONFLICT (application_id, round_id, evaluator_id) DO NOTHING;
    END LOOP;
END;
$function$;

-- Grant execute permission (if needed)
-- GRANT EXECUTE ON FUNCTION public.assign_evaluators_to_application(uuid, uuid, uuid[]) TO authenticated;

-- Verify the function was created
SELECT '✅ Function assign_evaluators_to_application() migrated to use user_profiles (NO FALLBACK - OPTIMIZED)' as status;











