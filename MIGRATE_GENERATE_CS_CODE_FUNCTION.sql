-- =====================================================
-- MIGRATE generate_cs_code() TO USE user_profiles
-- OPTIMIZED VERSION: NO FALLBACK (FASTER FOR LARGE USER BASE)
-- =====================================================
-- This function generates a unique CS (Company Secretary) code
-- Frontend Impact: ✅ Check if function is used - if used, signature stays same
-- 
-- Migration: Replace ALL `users` table references with `user_profiles`
-- NO FALLBACKS - Only queries user_profiles table

DROP FUNCTION IF EXISTS public.generate_cs_code() CASCADE;

CREATE OR REPLACE FUNCTION public.generate_cs_code()
RETURNS character varying
LANGUAGE plpgsql
AS $function$
DECLARE
    new_code VARCHAR(20);
BEGIN
    LOOP
        new_code := 'CS-' || upper(substring(replace(gen_random_uuid()::text,'-','') from 1 for 6));
        -- MIGRATED: Check if code already exists in user_profiles instead of users
        EXIT WHEN NOT EXISTS (SELECT 1 FROM public.user_profiles WHERE cs_code = new_code);
    END LOOP;
    RETURN new_code;
END;
$function$;

-- Grant execute permission (if needed)
-- GRANT EXECUTE ON FUNCTION public.generate_cs_code() TO authenticated;
-- GRANT EXECUTE ON FUNCTION public.generate_cs_code() TO anon;

-- Verify the function was created
SELECT '✅ Function generate_cs_code() migrated to use user_profiles (NO FALLBACK - OPTIMIZED)' as status;


