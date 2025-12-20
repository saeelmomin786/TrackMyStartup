-- =====================================================
-- MIGRATE generate_ca_code() TO USE user_profiles
-- OPTIMIZED VERSION: NO FALLBACK (FASTER FOR LARGE USER BASE)
-- =====================================================
-- This function generates a unique CA (Chartered Accountant) code
-- Frontend Impact: ✅ Check if function is used - if used, signature stays same
-- 
-- Migration: Replace ALL `users` table references with `user_profiles`
-- NO FALLBACKS - Only queries user_profiles table

DROP FUNCTION IF EXISTS public.generate_ca_code() CASCADE;

CREATE OR REPLACE FUNCTION public.generate_ca_code()
RETURNS character varying
LANGUAGE plpgsql
AS $function$
DECLARE
    new_code VARCHAR(20);
    counter INTEGER := 1;
BEGIN
    LOOP
        -- Generate code in format CA-XXXXXX (6 random alphanumeric characters)
        new_code := 'CA-' || upper(substring(md5(random()::text) from 1 for 6));
        
        -- MIGRATED: Check if code already exists in user_profiles instead of users
        IF NOT EXISTS (SELECT 1 FROM public.user_profiles WHERE ca_code = new_code) THEN
            RETURN new_code;
        END IF;
        
        counter := counter + 1;
        IF counter > 100 THEN
            RAISE EXCEPTION 'Unable to generate unique CA code after 100 attempts';
        END IF;
    END LOOP;
END;
$function$;

-- Grant execute permission (if needed)
-- GRANT EXECUTE ON FUNCTION public.generate_ca_code() TO authenticated;
-- GRANT EXECUTE ON FUNCTION public.generate_ca_code() TO anon;

-- Verify the function was created
SELECT '✅ Function generate_ca_code() migrated to use user_profiles (NO FALLBACK - OPTIMIZED)' as status;



