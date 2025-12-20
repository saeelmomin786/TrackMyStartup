-- =====================================================
-- MIGRATE get_investment_advisor_investors() TO USE user_profiles
-- OPTIMIZED VERSION: NO FALLBACK (FASTER FOR LARGE USER BASE)
-- =====================================================
-- This function returns all investors for an investment advisor
-- Frontend Impact: ✅ Check if function is used - if used, signature stays same
-- 
-- Migration: Replace ALL `users` table references with `user_profiles`
-- NO FALLBACKS - Only queries user_profiles table

DROP FUNCTION IF EXISTS public.get_investment_advisor_investors(uuid) CASCADE;

CREATE OR REPLACE FUNCTION public.get_investment_advisor_investors(advisor_id uuid)
RETURNS TABLE(
    id uuid, 
    name text, 
    email text, 
    registration_date date, 
    investor_code text
)
LANGUAGE plpgsql
AS $function$
DECLARE
    advisor_code_value TEXT;
BEGIN
    -- MIGRATED: Get advisor's code from user_profiles (most recent profile)
    SELECT COALESCE(up.investment_advisor_code, up.investment_advisor_code_entered)
    INTO advisor_code_value
    FROM public.user_profiles up
    WHERE up.auth_user_id = advisor_id 
    AND up.role = 'Investment Advisor'
    ORDER BY up.created_at DESC
    LIMIT 1;
    
    -- If advisor code not found, return empty result
    IF advisor_code_value IS NULL THEN
        RETURN;
    END IF;
    
    -- MIGRATED: Return investors from user_profiles who have this advisor code
    RETURN QUERY
    SELECT 
        up.auth_user_id as id,
        up.name,
        up.email,
        up.registration_date::DATE,
        up.investor_code
    FROM public.user_profiles up
    WHERE up.role = 'Investor' 
    AND (
        up.investment_advisor_code = advisor_code_value
        OR up.investment_advisor_code_entered = advisor_code_value
    )
    ORDER BY up.created_at DESC;
END;
$function$;

-- Grant execute permission (if needed)
-- GRANT EXECUTE ON FUNCTION public.get_investment_advisor_investors(uuid) TO authenticated;

-- Verify the function was created
SELECT '✅ Function get_investment_advisor_investors() migrated to use user_profiles (NO FALLBACK - OPTIMIZED)' as status;



