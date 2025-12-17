-- =====================================================
-- CHECK WHICH TABLES ARE ACTUALLY BEING USED
-- =====================================================
-- Run this BEFORE FIX_FK_TO_USERS_TABLES.sql
-- to see which tables have data and might be in use
-- =====================================================

-- Check which tables have data (indicating they're being used)
SELECT 
    'Tables with data (likely in use)' as category,
    schemaname,
    relname as tablename,
    n_live_tup as row_count
FROM pg_stat_user_tables
WHERE schemaname = 'public'
AND relname IN (
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
AND n_live_tup > 0
ORDER BY n_live_tup DESC;

-- Check current policies for these tables
SELECT 
    'Current policies' as category,
    tablename,
    policyname,
    cmd,
    CASE 
        WHEN qual LIKE '%auth.uid()%' OR with_check LIKE '%auth.uid()%' THEN '✅ Uses auth.uid()'
        WHEN qual LIKE '%user_profiles%' OR with_check LIKE '%user_profiles%' THEN '⚠️ Uses profile IDs (will break FK)'
        ELSE '❓ Unknown pattern'
    END as policy_status
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
ORDER BY tablename, cmd;

-- Summary: Which tables need fixing
SELECT 
    'Tables that need fixing' as category,
    tablename,
    COUNT(*) as policy_count,
    CASE 
        WHEN COUNT(*) = 0 THEN '❌ No policies'
        WHEN BOOL_OR(qual LIKE '%auth.uid()%' OR with_check LIKE '%auth.uid()%') THEN '✅ Already uses auth.uid()'
        ELSE '⚠️ Needs fix (uses profile IDs)'
    END as status
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
GROUP BY tablename
ORDER BY tablename;

