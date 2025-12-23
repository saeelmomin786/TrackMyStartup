-- =====================================================
-- MIGRATE safe_delete_startup_user() TO USE user_profiles
-- OPTIMIZED VERSION: NO FALLBACK (FASTER FOR LARGE USER BASE)
-- =====================================================
-- This function safely deletes a startup user and their associated startups
-- Frontend Impact: ✅ Check if function is used - if used, signature stays same
-- 
-- Migration: Replace ALL `users` table references with `user_profiles`
-- NO FALLBACKS - Only queries and deletes from user_profiles table

DROP FUNCTION IF EXISTS public.safe_delete_startup_user(uuid) CASCADE;

CREATE OR REPLACE FUNCTION public.safe_delete_startup_user(user_id_to_delete uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  user_role TEXT;
  startup_count INTEGER;
  deletion_result TEXT;
BEGIN
  -- MIGRATED: Get user role from user_profiles (get most recent Startup profile)
  SELECT up.role INTO user_role 
  FROM public.user_profiles up
  WHERE up.auth_user_id = user_id_to_delete
  AND up.role = 'Startup'
  ORDER BY up.created_at DESC
  LIMIT 1;
  
  IF user_role IS NULL THEN
    RETURN 'User not found or not a startup user';
  END IF;
  
  IF user_role != 'Startup' THEN
    RETURN 'User is not a startup user';
  END IF;
  
  -- Count startups for this user
  SELECT COUNT(*) INTO startup_count 
  FROM public.startups 
  WHERE user_id = user_id_to_delete;
  
  -- Delete startups first (this will cascade to related data)
  DELETE FROM public.startups 
  WHERE user_id = user_id_to_delete;
  
  -- MIGRATED: Delete all profiles for this user from user_profiles (or just Startup profile)
  -- Delete all profiles to match original behavior of deleting the entire user
  DELETE FROM public.user_profiles 
  WHERE auth_user_id = user_id_to_delete;
  
  RETURN 'Successfully deleted startup user and ' || startup_count || ' associated startups';
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN 'Error: ' || SQLERRM;
END;
$function$;

-- Grant execute permission (if needed)
-- GRANT EXECUTE ON FUNCTION public.safe_delete_startup_user(uuid) TO authenticated;

-- Verify the function was created
SELECT '✅ Function safe_delete_startup_user() migrated to use user_profiles (NO FALLBACK - OPTIMIZED)' as status;











