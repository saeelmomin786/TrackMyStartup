-- =====================================================
-- MIGRATE update_investment_advisor_relationship() TO USE user_profiles
-- OPTIMIZED VERSION: NO FALLBACK (FASTER FOR LARGE USER BASE)
-- =====================================================
-- This function is a TRIGGER that creates investment advisor relationships
-- Frontend Impact: ✅ Check if function is used - if used, signature stays same
-- 
-- Migration: Replace ALL `users` table references with `user_profiles`
-- NO FALLBACKS - Only queries user_profiles table
-- Note: This is a trigger function - ensure trigger is on user_profiles table

DROP FUNCTION IF EXISTS public.update_investment_advisor_relationship() CASCADE;

CREATE OR REPLACE FUNCTION public.update_investment_advisor_relationship()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
    advisor_auth_user_id UUID;
BEGIN
    -- If user is an investor and has an investment advisor code ENTERED
    IF NEW.role = 'Investor' AND NEW.investment_advisor_code_entered IS NOT NULL THEN
        -- MIGRATED: Get advisor's auth_user_id from user_profiles (get most recent profile)
        SELECT up.auth_user_id INTO advisor_auth_user_id
        FROM public.user_profiles up
        WHERE (
            up.investment_advisor_code = NEW.investment_advisor_code_entered
            OR up.investment_advisor_code_entered = NEW.investment_advisor_code_entered
        )
        AND up.role = 'Investment Advisor'
        ORDER BY up.created_at DESC
        LIMIT 1;
        
        -- Only insert if advisor was found
        IF advisor_auth_user_id IS NOT NULL THEN
            INSERT INTO investment_advisor_relationships (
                investment_advisor_id,
                investor_id,
                relationship_type
            ) VALUES (
                advisor_auth_user_id,
                NEW.auth_user_id,  -- MIGRATED: Use auth_user_id instead of id
                'advisor_investor'
            ) ON CONFLICT (investment_advisor_id, investor_id, relationship_type) DO NOTHING;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$function$;

-- Note: If there's a trigger using this function, ensure it's on user_profiles table
-- Example trigger (if needed):
-- DROP TRIGGER IF EXISTS update_investment_advisor_relationship_trigger ON public.user_profiles;
-- CREATE TRIGGER update_investment_advisor_relationship_trigger
--     AFTER INSERT OR UPDATE ON public.user_profiles
--     FOR EACH ROW
--     WHEN (NEW.role = 'Investor' AND NEW.investment_advisor_code_entered IS NOT NULL)
--     EXECUTE FUNCTION public.update_investment_advisor_relationship();

-- Grant execute permission (if needed)
-- GRANT EXECUTE ON FUNCTION public.update_investment_advisor_relationship() TO authenticated;

-- Verify the function was created
SELECT '✅ Function update_investment_advisor_relationship() migrated to use user_profiles (NO FALLBACK - OPTIMIZED)' as status;





