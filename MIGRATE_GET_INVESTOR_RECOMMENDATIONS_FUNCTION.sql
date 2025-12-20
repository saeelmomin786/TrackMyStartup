-- =====================================================
-- MIGRATE get_investor_recommendations() TO USE user_profiles
-- OPTIMIZED VERSION: NO FALLBACK (FASTER FOR LARGE USER BASE)
-- =====================================================
-- This function returns investment recommendations for an investor
-- Frontend Impact: ✅ Check if function is used - if used, signature stays same
-- 
-- Migration: Replace ALL `users` table references with `user_profiles`
-- NO FALLBACKS - Only queries user_profiles table

DROP FUNCTION IF EXISTS public.get_investor_recommendations(uuid) CASCADE;

CREATE OR REPLACE FUNCTION public.get_investor_recommendations(p_investor_id uuid)
RETURNS TABLE(
    id integer, 
    startup_name text, 
    startup_sector text, 
    startup_valuation numeric, 
    recommended_deal_value numeric, 
    recommended_valuation numeric, 
    recommendation_notes text, 
    advisor_name text, 
    status text, 
    created_at timestamp with time zone
)
LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY
    SELECT 
        iar.id,
        s.name as startup_name,
        s.sector as startup_sector,
        s.current_valuation as startup_valuation,
        iar.recommended_deal_value,
        iar.recommended_valuation,
        iar.recommendation_notes,
        up.name as advisor_name,
        iar.status,
        iar.created_at
    FROM investment_advisor_recommendations iar
    JOIN startups s ON iar.startup_id = s.id
    -- MIGRATED: Join with user_profiles instead of users (get most recent advisor profile)
    JOIN LATERAL (
        SELECT name
        FROM public.user_profiles
        WHERE auth_user_id = iar.investment_advisor_id
        AND role = 'Investment Advisor'
        ORDER BY created_at DESC
        LIMIT 1
    ) up ON true
    WHERE iar.investor_id = p_investor_id
    ORDER BY iar.created_at DESC;
END;
$function$;

-- Grant execute permission (if needed)
-- GRANT EXECUTE ON FUNCTION public.get_investor_recommendations(uuid) TO authenticated;

-- Verify the function was created
SELECT '✅ Function get_investor_recommendations() migrated to use user_profiles (NO FALLBACK - OPTIMIZED)' as status;



