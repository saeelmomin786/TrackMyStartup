-- =====================================================
-- MIGRATE get_due_diligence_requests_for_startup() TO USE user_profiles
-- OPTIMIZED VERSION: NO FALLBACK (FASTER FOR LARGE USER BASE)
-- =====================================================
-- This function returns due diligence requests for a startup
-- Frontend Impact: ✅ Check if function is used - if used, signature stays same
-- 
-- Migration: Replace ALL `users` table references with `user_profiles`
-- NO FALLBACKS - Only queries user_profiles table

DROP FUNCTION IF EXISTS public.get_due_diligence_requests_for_startup(text) CASCADE;

CREATE OR REPLACE FUNCTION public.get_due_diligence_requests_for_startup(p_startup_id text)
RETURNS TABLE(
    id uuid, 
    user_id uuid, 
    startup_id text, 
    status text, 
    created_at timestamp with time zone, 
    investor_name text, 
    investor_email text
)
LANGUAGE sql
SECURITY DEFINER
AS $function$
  SELECT 
    r.id,
    r.user_id,
    r.startup_id,
    r.status,
    r.created_at,
    up.name AS investor_name,
    up.email AS investor_email
  FROM public.due_diligence_requests r
  JOIN public.startups s ON s.id::text = r.startup_id
  -- MIGRATED: Join with user_profiles instead of users (get most recent investor profile)
  JOIN LATERAL (
    SELECT name, email
    FROM public.user_profiles
    WHERE auth_user_id = r.user_id
    AND role = 'Investor'
    ORDER BY created_at DESC
    LIMIT 1
  ) up ON true
  WHERE r.startup_id = p_startup_id
    AND (s.user_id = auth.uid());
$function$;

-- Grant execute permission (if needed)
-- GRANT EXECUTE ON FUNCTION public.get_due_diligence_requests_for_startup(text) TO authenticated;

-- Verify the function was created
SELECT '✅ Function get_due_diligence_requests_for_startup() migrated to use user_profiles (NO FALLBACK - OPTIMIZED)' as status;


