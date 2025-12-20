-- =====================================================
-- MIGRATE generate_investment_advisor_code() TO USE user_profiles
-- OPTIMIZED VERSION: NO FALLBACK (FASTER FOR LARGE USER BASE)
-- =====================================================
-- This function generates a unique investment advisor code
-- Frontend Impact: ✅ Check if function is used - if used, signature stays same
-- 
-- Migration: Replace ALL `users` table references with `user_profiles`
-- NO FALLBACKS - Only queries user_profiles table

DROP FUNCTION IF EXISTS public.generate_investment_advisor_code() CASCADE;

CREATE OR REPLACE FUNCTION public.generate_investment_advisor_code()
RETURNS text
LANGUAGE plpgsql
AS $function$
DECLARE
    new_code TEXT;
    code_exists BOOLEAN;
BEGIN
    LOOP
        -- Generate a code like IA-XXXXXX
        new_code := 'IA-' || LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');
        
        -- MIGRATED: Check if code already exists in user_profiles instead of users
        SELECT EXISTS(
            SELECT 1 FROM public.user_profiles 
            WHERE investment_advisor_code = new_code
        ) INTO code_exists;
        
        -- If code doesn't exist, return it
        IF NOT code_exists THEN
            RETURN new_code;
        END IF;
    END LOOP;
END;
$function$;

-- Grant execute permission (if needed)
-- GRANT EXECUTE ON FUNCTION public.generate_investment_advisor_code() TO authenticated;
-- GRANT EXECUTE ON FUNCTION public.generate_investment_advisor_code() TO anon;

-- Verify the function was created
SELECT '✅ Function generate_investment_advisor_code() migrated to use user_profiles (NO FALLBACK - OPTIMIZED)' as status;



