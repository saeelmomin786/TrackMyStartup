-- =====================================================
-- MIGRATE user_startup_info VIEW TO USE user_profiles
-- OPTIMIZED VERSION: NO FALLBACK (FASTER FOR LARGE USER BASE)
-- =====================================================

DROP VIEW IF EXISTS public.user_startup_info CASCADE;

CREATE OR REPLACE VIEW public.user_startup_info AS
SELECT 
    up.auth_user_id AS user_id,  -- MIGRATED: Use auth_user_id instead of id
    up.email,
    up.name AS user_name,
    up.role,
    up.startup_name,
    s.id AS startup_id,
    s.sector,
    s.current_valuation,
    s.total_funding,
    s.total_revenue,
    s.compliance_status,
    s.registration_date
FROM (
    -- MIGRATED: Get most recent Startup profile for each auth_user_id
    SELECT DISTINCT ON (auth_user_id) 
        auth_user_id,
        email,
        name,
        role,
        startup_name
    FROM public.user_profiles
    WHERE role = 'Startup'::user_role
    ORDER BY auth_user_id, created_at DESC
) up
LEFT JOIN startups s ON up.startup_name = s.name;

-- Grant permissions (if needed)
-- GRANT SELECT ON public.user_startup_info TO authenticated;

SELECT '✅ View user_startup_info migrated to use user_profiles (NO FALLBACK - OPTIMIZED)' as status;


