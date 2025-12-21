-- =====================================================
-- MIGRATE generate_mentor_code() TO USE user_profiles
-- OPTIMIZED VERSION: NO FALLBACK (FASTER FOR LARGE USER BASE)
-- =====================================================
-- This function generates a unique mentor code
-- Frontend Impact: ✅ Check if function is used - if used, signature stays same
-- 
-- Migration: Replace ALL `users` table references with `user_profiles`
-- NO FALLBACKS - Only queries user_profiles table

DROP FUNCTION IF EXISTS public.generate_mentor_code() CASCADE;

CREATE OR REPLACE FUNCTION public.generate_mentor_code()
RETURNS character varying
LANGUAGE plpgsql
AS $function$
DECLARE
    new_code VARCHAR(10);
    code_exists BOOLEAN;
    attempts INTEGER := 0;
    max_attempts INTEGER := 100;
BEGIN
    LOOP
        -- Generate a random 6-character code with MEN- prefix
        new_code := 'MEN-' || upper(substring(md5(random()::text) from 1 for 6));
        
        -- MIGRATED: Check if code already exists in user_profiles instead of users
        SELECT EXISTS(
            SELECT 1 FROM public.user_profiles WHERE mentor_code = new_code
        ) INTO code_exists;
        
        -- If code doesn't exist, return it
        IF NOT code_exists THEN
            RETURN new_code;
        END IF;
        
        -- Prevent infinite loop
        attempts := attempts + 1;
        IF attempts >= max_attempts THEN
            RAISE EXCEPTION 'Could not generate unique mentor code after % attempts', max_attempts;
        END IF;
    END LOOP;
END;
$function$;

-- Grant execute permission (if needed)
-- GRANT EXECUTE ON FUNCTION public.generate_mentor_code() TO authenticated;
-- GRANT EXECUTE ON FUNCTION public.generate_mentor_code() TO anon;

-- Verify the function was created
SELECT '✅ Function generate_mentor_code() migrated to use user_profiles (NO FALLBACK - OPTIMIZED)' as status;





