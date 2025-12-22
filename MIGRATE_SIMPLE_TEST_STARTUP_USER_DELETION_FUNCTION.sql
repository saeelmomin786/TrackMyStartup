-- =====================================================
-- MIGRATE simple_test_startup_user_deletion() TO USE user_profiles
-- OPTIMIZED VERSION: NO FALLBACK (FASTER FOR LARGE USER BASE)
-- =====================================================
-- This is a TEST/DEBUG function for checking startup user deletion readiness
-- Frontend Impact: ✅ Check if function is used - if used, signature stays same
-- 
-- Migration: Replace ALL `users` table references with `user_profiles`
-- NO FALLBACKS - Only queries user_profiles table

DROP FUNCTION IF EXISTS public.simple_test_startup_user_deletion(uuid) CASCADE;

CREATE OR REPLACE FUNCTION public.simple_test_startup_user_deletion(user_id_to_test uuid)
RETURNS TABLE(test_type text, result text)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  user_role TEXT;
  startup_count INTEGER;
  founder_count INTEGER;
  investment_count INTEGER;
  subsidiary_count INTEGER;
  employee_count INTEGER;
  financial_count INTEGER;
  verification_count INTEGER;
BEGIN
  -- MIGRATED: Get user role from user_profiles (most recent profile)
  SELECT role::TEXT INTO user_role 
  FROM public.user_profiles 
  WHERE auth_user_id = user_id_to_test  -- MIGRATED: Use auth_user_id instead of id
  ORDER BY created_at DESC
  LIMIT 1;
  
  IF user_role IS NULL THEN
    RETURN QUERY SELECT 'User Check'::TEXT, 'User not found'::TEXT;
    RETURN;
  END IF;
  
  RETURN QUERY SELECT 'User Check'::TEXT, ('User found with role: ' || user_role)::TEXT;
  
  -- If it's a startup user, count related data
  IF user_role = 'Startup' THEN
    -- Count startups
    SELECT COUNT(*) INTO startup_count FROM public.startups WHERE user_id = user_id_to_test;
    RETURN QUERY SELECT 'Startup Count'::TEXT, ('Found ' || startup_count || ' startups')::TEXT;
    
    -- Count related data in other tables
    SELECT COUNT(*) INTO founder_count 
    FROM public.founders f 
    JOIN public.startups s ON f.startup_id = s.id 
    WHERE s.user_id = user_id_to_test;
    RETURN QUERY SELECT 'Founder Count'::TEXT, ('Found ' || founder_count || ' founders')::TEXT;
    
    SELECT COUNT(*) INTO investment_count 
    FROM public.investment_records ir 
    JOIN public.startups s ON ir.startup_id = s.id 
    WHERE s.user_id = user_id_to_test;
    RETURN QUERY SELECT 'Investment Count'::TEXT, ('Found ' || investment_count || ' investment records')::TEXT;
    
    SELECT COUNT(*) INTO subsidiary_count 
    FROM public.subsidiaries sub 
    JOIN public.startups s ON sub.startup_id = s.id 
    WHERE s.user_id = user_id_to_test;
    RETURN QUERY SELECT 'Subsidiary Count'::TEXT, ('Found ' || subsidiary_count || ' subsidiaries')::TEXT;
    
    SELECT COUNT(*) INTO employee_count 
    FROM public.employees emp 
    JOIN public.startups s ON emp.startup_id = s.id 
    WHERE s.user_id = user_id_to_test;
    RETURN QUERY SELECT 'Employee Count'::TEXT, ('Found ' || employee_count || ' employees')::TEXT;
    
    SELECT COUNT(*) INTO financial_count 
    FROM public.financial_records fr 
    JOIN public.startups s ON fr.startup_id = s.id 
    WHERE s.user_id = user_id_to_test;
    RETURN QUERY SELECT 'Financial Count'::TEXT, ('Found ' || financial_count || ' financial records')::TEXT;
    
    SELECT COUNT(*) INTO verification_count 
    FROM public.verification_requests vr 
    JOIN public.startups s ON vr.startup_id = s.id 
    WHERE s.user_id = user_id_to_test;
    RETURN QUERY SELECT 'Verification Count'::TEXT, ('Found ' || verification_count || ' verification requests')::TEXT;
    
    RETURN QUERY SELECT 'Deletion Test'::TEXT, 'User can be safely deleted (all related data will be cascaded)'::TEXT;
  ELSE
    RETURN QUERY SELECT 'Deletion Test'::TEXT, ('User is not a startup user (role: ' || user_role || ') - standard deletion applies')::TEXT;
  END IF;
END;
$function$;

-- Grant execute permission (if needed)
-- GRANT EXECUTE ON FUNCTION public.simple_test_startup_user_deletion(uuid) TO authenticated;

-- Verify the function was created
SELECT '✅ Function simple_test_startup_user_deletion() migrated to use user_profiles (NO FALLBACK - OPTIMIZED)' as status;







