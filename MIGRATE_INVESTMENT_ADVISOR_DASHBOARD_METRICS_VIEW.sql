-- =====================================================
-- MIGRATE investment_advisor_dashboard_metrics VIEW TO USE user_profiles
-- OPTIMIZED VERSION: NO FALLBACK (FASTER FOR LARGE USER BASE)
-- =====================================================

DROP VIEW IF EXISTS public.investment_advisor_dashboard_metrics CASCADE;

CREATE OR REPLACE VIEW public.investment_advisor_dashboard_metrics AS
SELECT 
    up.auth_user_id AS advisor_id,  -- MIGRATED: Use auth_user_id instead of id
    up.name AS advisor_name,
    COALESCE(up.investment_advisor_code, up.investment_advisor_code_entered) AS investment_advisor_code,
    count(DISTINCT iar.investor_id) AS total_investors,
    count(DISTINCT iar.startup_id) AS total_startups,
    count(DISTINCT iar.id) AS total_recommendations,
    COALESCE(sum(iac.investment_amount), (0)::numeric) AS total_investments_facilitated,
    COALESCE(sum(iac.scouting_fee_amount), (0)::numeric) AS total_scouting_fees
FROM (
    -- MIGRATED: Get most recent Investment Advisor profile for each auth_user_id
    SELECT DISTINCT ON (auth_user_id) 
        auth_user_id,
        name,
        investment_advisor_code,
        investment_advisor_code_entered
    FROM public.user_profiles
    WHERE role = 'Investment Advisor'::user_role
    ORDER BY auth_user_id, created_at DESC
) up
LEFT JOIN investment_advisor_relationships iar ON up.auth_user_id = iar.investment_advisor_id
LEFT JOIN investment_advisor_commissions iac ON up.auth_user_id = iac.investment_advisor_id
GROUP BY up.auth_user_id, up.name, COALESCE(up.investment_advisor_code, up.investment_advisor_code_entered);

-- Grant permissions (if needed)
-- GRANT SELECT ON public.investment_advisor_dashboard_metrics TO authenticated;

SELECT '✅ View investment_advisor_dashboard_metrics migrated to use user_profiles (NO FALLBACK - OPTIMIZED)' as status;









