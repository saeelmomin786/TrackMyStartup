-- =====================================================
-- MIGRATE get_investment_advisor_startups() TO USE user_profiles
-- OPTIMIZED VERSION: NO FALLBACK (FASTER FOR LARGE USER BASE)
-- =====================================================
-- This function returns all startups for an investment advisor
-- Frontend Impact: ✅ Check if function is used - if used, signature stays same
-- 
-- Migration: Replace ALL `users` table references with `user_profiles`
-- NO FALLBACKS - Only queries user_profiles table

DROP FUNCTION IF EXISTS public.get_investment_advisor_startups(uuid) CASCADE;

CREATE OR REPLACE FUNCTION public.get_investment_advisor_startups(advisor_id uuid)
RETURNS TABLE(
    id integer, 
    name text, 
    sector text, 
    current_valuation numeric, 
    compliance_status text, 
    total_funding numeric, 
    total_revenue numeric, 
    registration_date date
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
    
    -- Return startups that have this advisor code
    RETURN QUERY
    SELECT 
        s.id,
        s.name,
        s.sector,
        s.current_valuation,
        s.compliance_status,
        s.total_funding,
        s.total_revenue,
        s.registration_date::DATE
    FROM startups s
    WHERE s.investment_advisor_code = advisor_code_value
    ORDER BY s.created_at DESC;
END;
$function$;

-- Grant execute permission (if needed)
-- GRANT EXECUTE ON FUNCTION public.get_investment_advisor_startups(uuid) TO authenticated;

-- Verify the function was created
SELECT '✅ Function get_investment_advisor_startups() migrated to use user_profiles (NO FALLBACK - OPTIMIZED)' as status;



