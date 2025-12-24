-- =====================================================
-- MIGRATE simple_deletion_test() TO USE user_profiles
-- OPTIMIZED VERSION: NO FALLBACK (FASTER FOR LARGE USER BASE)
-- =====================================================
-- This is a TEST/DEBUG function for checking user deletion readiness
-- Frontend Impact: ✅ Check if function is used - if used, signature stays same
-- 
-- Migration: Replace ALL `users` table references with `user_profiles`
-- NO FALLBACKS - Only queries user_profiles table

DROP FUNCTION IF EXISTS public.simple_deletion_test(uuid) CASCADE;

CREATE OR REPLACE FUNCTION public.simple_deletion_test(user_id_to_test uuid)
RETURNS TABLE(test_type text, result text)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  user_role TEXT;
  startup_count INTEGER;
  has_startup_name BOOLEAN;
BEGIN
  -- MIGRATED: Get user info from user_profiles (most recent profile)
  SELECT role::TEXT, (startup_name IS NOT NULL) INTO user_role, has_startup_name 
  FROM public.user_profiles 
  WHERE auth_user_id = user_id_to_test  -- MIGRATED: Use auth_user_id instead of id
  ORDER BY created_at DESC
  LIMIT 1;
  
  IF user_role IS NULL THEN
    RETURN QUERY SELECT 'User Check'::TEXT, 'User not found'::TEXT;
    RETURN;
  END IF;
  
  RETURN QUERY SELECT 'User Check'::TEXT, ('Role: ' || user_role || ', Has startup_name: ' || has_startup_name)::TEXT;
  
  IF user_role = 'Startup' THEN
    -- Count startups
    SELECT COUNT(*) INTO startup_count FROM public.startups WHERE user_id = user_id_to_test;
    RETURN QUERY SELECT 'Startup Count'::TEXT, ('Found ' || startup_count || ' startups')::TEXT;
    
    -- Check for potential issues
    IF has_startup_name AND startup_count = 0 THEN
      RETURN QUERY SELECT 'Issue Found'::TEXT, 'User has startup_name but no startup record - this may cause deletion issues'::TEXT;
    END IF;
    
    IF NOT has_startup_name AND startup_count > 0 THEN
      RETURN QUERY SELECT 'Issue Found'::TEXT, 'User has startup records but no startup_name - this may cause deletion issues'::TEXT;
    END IF;
    
    RETURN QUERY SELECT 'Deletion Assessment'::TEXT, 'User appears ready for deletion'::TEXT;
  ELSE
    RETURN QUERY SELECT 'Deletion Assessment'::TEXT, 'Non-startup user - standard deletion applies'::TEXT;
  END IF;
END;
$function$;

-- Grant execute permission (if needed)
-- GRANT EXECUTE ON FUNCTION public.simple_deletion_test(uuid) TO authenticated;

-- Verify the function was created
SELECT '✅ Function simple_deletion_test() migrated to use user_profiles (NO FALLBACK - OPTIMIZED)' as status;















