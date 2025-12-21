-- =====================================================
-- MIGRATE get_applications_with_codes() TO USE user_profiles
-- OPTIMIZED VERSION: NO FALLBACK (FASTER FOR LARGE USER BASE)
-- =====================================================
-- This function returns opportunity applications with facilitator codes and names
-- Frontend Impact: ✅ Check if function is used - if used, signature stays same
-- 
-- Migration: Replace ALL `users` table references with `user_profiles`
-- NO FALLBACKS - Only queries user_profiles table

DROP FUNCTION IF EXISTS public.get_applications_with_codes() CASCADE;

CREATE OR REPLACE FUNCTION public.get_applications_with_codes()
RETURNS TABLE(
    id uuid, 
    opportunity_id uuid, 
    startup_id bigint, 
    startup_name text, 
    facilitator_code character varying, 
    facilitator_name text, 
    program_name text, 
    status text, 
    diligence_status text, 
    agreement_url text, 
    created_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
    RETURN QUERY
    SELECT 
        oa.id,
        oa.opportunity_id,
        oa.startup_id,
        s.name as startup_name,
        io.facilitator_code,
        up.name as facilitator_name,
        io.program_name,
        oa.status,
        oa.diligence_status,
        oa.agreement_url,
        oa.created_at
    FROM public.opportunity_applications oa
    JOIN public.incubation_opportunities io ON oa.opportunity_id = io.id
    JOIN public.startups s ON oa.startup_id = s.id
    -- MIGRATED: Join with user_profiles instead of users (get most recent facilitator profile)
    LEFT JOIN LATERAL (
        SELECT name
        FROM public.user_profiles
        WHERE auth_user_id = io.facilitator_id
        AND role = 'Startup Facilitation Center'
        ORDER BY created_at DESC
        LIMIT 1
    ) up ON true
    ORDER BY oa.created_at DESC;
END;
$function$;

-- Grant execute permission (if needed)
-- GRANT EXECUTE ON FUNCTION public.get_applications_with_codes() TO authenticated;
-- GRANT EXECUTE ON FUNCTION public.get_applications_with_codes() TO anon;

-- Verify the function was created
SELECT '✅ Function get_applications_with_codes() migrated to use user_profiles (NO FALLBACK - OPTIMIZED)' as status;





