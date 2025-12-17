-- =====================================================
-- CHECK DETAILED POLICY DEFINITIONS
-- =====================================================
-- Check if policies allow profile IDs as fallback
-- (which would violate FK constraints)
-- =====================================================

-- Show full policy definitions for tables with FK to users(id)
SELECT 
    tablename,
    policyname,
    cmd,
    CASE 
        WHEN qual LIKE '%user_profiles%' OR with_check LIKE '%user_profiles%' THEN '⚠️ Allows profile IDs (FK violation risk)'
        WHEN qual LIKE '%auth.uid()%' OR with_check LIKE '%auth.uid()%' THEN '✅ Uses auth.uid() only'
        ELSE '❓ Unknown pattern'
    END as policy_type,
    COALESCE(qual, 'N/A') as using_expression,
    COALESCE(with_check, 'N/A') as with_check_expression
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN (
    'advisor_startup_link_requests',
    'co_investment_approvals',
    'co_investment_interests',
    'co_investment_offers',
    'co_investment_opportunities',
    'contact_details_access',
    'evaluators',
    'investment_advisor_commissions',
    'investment_advisor_offer_visibility',
    'investment_advisor_recommendations',
    'investment_advisor_relationships',
    'investment_offers',
    'investor_favorites',
    'startups',
    'user_submitted_compliances'
)
ORDER BY 
    CASE 
        WHEN qual LIKE '%user_profiles%' OR with_check LIKE '%user_profiles%' THEN 0
        ELSE 1
    END,
    tablename, 
    cmd;

-- Summary: Which tables have policies that allow profile IDs
SELECT 
    '⚠️ Tables with profile ID fallback (needs fix)' as category,
    tablename,
    COUNT(*) as policies_with_profile_fallback
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN (
    'advisor_startup_link_requests',
    'co_investment_approvals',
    'co_investment_interests',
    'co_investment_offers',
    'co_investment_opportunities',
    'contact_details_access',
    'evaluators',
    'investment_advisor_commissions',
    'investment_advisor_offer_visibility',
    'investment_advisor_recommendations',
    'investment_advisor_relationships',
    'investment_offers',
    'investor_favorites',
    'startups',
    'user_submitted_compliances'
)
AND (qual LIKE '%user_profiles%' OR with_check LIKE '%user_profiles%')
GROUP BY tablename
ORDER BY tablename;





