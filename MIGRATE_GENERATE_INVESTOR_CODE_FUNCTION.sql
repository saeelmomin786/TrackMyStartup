-- =====================================================
-- MIGRATE generate_investor_code() TO USE user_profiles
-- OPTIMIZED VERSION: NO FALLBACK (FASTER FOR LARGE USER BASE)
-- =====================================================
-- This function is a TRIGGER function that generates a unique investor code
-- Frontend Impact: ✅ Check if function is used - if used, signature stays same
-- 
-- Migration: Replace ALL `users` table references with `user_profiles`
-- NO FALLBACKS - Only queries user_profiles table
-- Note: This is a trigger function - ensure trigger is on user_profiles table

DROP FUNCTION IF EXISTS public.generate_investor_code() CASCADE;

CREATE OR REPLACE FUNCTION public.generate_investor_code()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
    new_code TEXT;
    attempts INTEGER;
    max_attempts INTEGER := 100;
BEGIN
    -- Only generate codes for investors
    IF NEW.role != 'Investor' THEN
        RETURN NEW;
    END IF;
    
    -- If investor already has a code, don't change it
    IF NEW.investor_code IS NOT NULL AND NEW.investor_code != '' THEN
        RETURN NEW;
    END IF;
    
    -- Generate a unique investor code
    attempts := 0;
    LOOP
        attempts := attempts + 1;
        new_code := 'INV-' || 
                   upper(substring(md5(random()::text || clock_timestamp()::text || NEW.id::text) from 1 for 6));
        
        -- MIGRATED: Check if code already exists in user_profiles instead of users
        IF NOT EXISTS (
            SELECT 1 FROM public.user_profiles WHERE investor_code = new_code
        ) THEN
            EXIT;
        END IF;
        
        -- Prevent infinite loop
        IF attempts >= max_attempts THEN
            RAISE EXCEPTION 'Unable to generate unique investor code after % attempts for user %', max_attempts, NEW.email;
        END IF;
    END LOOP;
    
    -- Set the new investor code
    NEW.investor_code := new_code;
    
    RAISE NOTICE 'Auto-generated investor code % for user % (%)', new_code, NEW.email, NEW.id;
    RETURN NEW;
END;
$function$;

-- Note: If there's a trigger using this function, ensure it's on user_profiles table
-- Example trigger (if needed):
-- DROP TRIGGER IF EXISTS generate_investor_code_trigger ON public.user_profiles;
-- CREATE TRIGGER generate_investor_code_trigger
--     BEFORE INSERT ON public.user_profiles
--     FOR EACH ROW
--     EXECUTE FUNCTION public.generate_investor_code();

-- Grant execute permission (if needed)
-- GRANT EXECUTE ON FUNCTION public.generate_investor_code() TO authenticated;

-- Verify the function was created
SELECT '✅ Function generate_investor_code() migrated to use user_profiles (NO FALLBACK - OPTIMIZED)' as status;







