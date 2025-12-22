-- =====================================================
-- MIGRATE user_center_info VIEW TO USE user_profiles
-- OPTIMIZED VERSION: NO FALLBACK (FASTER FOR LARGE USER BASE)
-- =====================================================

DROP VIEW IF EXISTS public.user_center_info CASCADE;

CREATE OR REPLACE VIEW public.user_center_info AS
SELECT 
    up.auth_user_id AS id,  -- MIGRATED: Use auth_user_id instead of id
    up.email,
    up.name AS user_name,
    up.center_name,
    up.role,
    up.registration_date,
    up.created_at,
    up.updated_at
FROM public.user_profiles up
WHERE up.role = 'Startup Facilitation Center'::user_role
  -- MIGRATED: Get most recent profile for each user
  AND up.id IN (
      SELECT DISTINCT ON (auth_user_id) id
      FROM public.user_profiles
      WHERE role = 'Startup Facilitation Center'::user_role
      ORDER BY auth_user_id, created_at DESC
  );

-- Grant permissions (if needed)
-- GRANT SELECT ON public.user_center_info TO authenticated;

SELECT '✅ View user_center_info migrated to use user_profiles (NO FALLBACK - OPTIMIZED)' as status;







