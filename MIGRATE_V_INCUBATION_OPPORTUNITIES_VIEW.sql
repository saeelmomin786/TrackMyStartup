-- =====================================================
-- MIGRATE v_incubation_opportunities VIEW TO USE user_profiles
-- OPTIMIZED VERSION: NO FALLBACK (FASTER FOR LARGE USER BASE)
-- =====================================================

DROP VIEW IF EXISTS public.v_incubation_opportunities CASCADE;

CREATE OR REPLACE VIEW public.v_incubation_opportunities AS
SELECT 
    o.id,
    o.facilitator_id,
    o.program_name,
    o.description,
    o.deadline,
    o.poster_url,
    o.video_url,
    o.created_at,
    up.name AS facilitator_name
FROM incubation_opportunities o
-- MIGRATED: Join with user_profiles (get most recent facilitator profile)
LEFT JOIN LATERAL (
    SELECT name
    FROM public.user_profiles
    WHERE auth_user_id = o.facilitator_id
      AND role = 'Startup Facilitation Center'::user_role
    ORDER BY created_at DESC
    LIMIT 1
) up ON true;

-- Grant permissions (if needed)
-- GRANT SELECT ON public.v_incubation_opportunities TO authenticated;

SELECT '✅ View v_incubation_opportunities migrated to use user_profiles (NO FALLBACK - OPTIMIZED)' as status;















