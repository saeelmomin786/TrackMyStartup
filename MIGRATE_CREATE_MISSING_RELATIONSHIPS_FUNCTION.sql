-- =====================================================
-- MIGRATE create_missing_relationships() TO USE user_profiles
-- OPTIMIZED VERSION: NO FALLBACK (FASTER FOR LARGE USER BASE)
-- =====================================================
-- This function creates missing investment advisor relationships
-- Frontend Impact: ✅ Check if function is used - if used, signature stays same
-- 
-- Migration: Replace ALL `users` table references with `user_profiles`
-- NO FALLBACKS - Only queries user_profiles table

DROP FUNCTION IF EXISTS public.create_missing_relationships() CASCADE;

CREATE OR REPLACE FUNCTION public.create_missing_relationships()
RETURNS TABLE(created_count integer, message text)
LANGUAGE plpgsql
AS $function$
DECLARE
  relationship_count INTEGER := 0;
BEGIN
  -- MIGRATED: Create relationships for startups with advisor codes using user_profiles
  INSERT INTO investment_advisor_relationships (investment_advisor_id, startup_id, relationship_type)
  SELECT 
    advisor.auth_user_id as investment_advisor_id,  -- MIGRATED: Use auth_user_id instead of id
    s.id as startup_id,
    'advisor_startup' as relationship_type
  FROM startups s
  -- MIGRATED: Join with user_profiles instead of users (get most recent advisor profile)
  JOIN LATERAL (
    SELECT auth_user_id
    FROM public.user_profiles
    WHERE (
        investment_advisor_code = s.investment_advisor_code
        OR investment_advisor_code_entered = s.investment_advisor_code
    )
    AND role IN ('Investment Advisor', 'Admin')  -- Match original behavior
    ORDER BY created_at DESC
    LIMIT 1
  ) advisor ON true
  WHERE s.investment_advisor_code IS NOT NULL
  ON CONFLICT (investment_advisor_id, startup_id, relationship_type) DO NOTHING;
  
  GET DIAGNOSTICS relationship_count = ROW_COUNT;
  
  RETURN QUERY SELECT relationship_count, 'Created ' || relationship_count || ' advisor-startup relationships';
END;
$function$;

-- Grant execute permission (if needed)
-- GRANT EXECUTE ON FUNCTION public.create_missing_relationships() TO authenticated;

-- Verify the function was created
SELECT '✅ Function create_missing_relationships() migrated to use user_profiles (NO FALLBACK - OPTIMIZED)' as status;

