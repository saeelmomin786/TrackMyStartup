-- =====================================================
-- VERIFY ALL TABLES WITH FK TO users(id)
-- =====================================================
-- Check if all 15 tables with FK to users(id) have correct policies
-- =====================================================

-- List of all tables with FK to users(id) that we identified
WITH fk_tables AS (
    SELECT 'advisor_startup_link_requests' as tablename UNION ALL
    SELECT 'co_investment_approvals' UNION ALL
    SELECT 'co_investment_interests' UNION ALL
    SELECT 'co_investment_offers' UNION ALL
    SELECT 'co_investment_opportunities' UNION ALL
    SELECT 'contact_details_access' UNION ALL
    SELECT 'evaluators' UNION ALL
    SELECT 'investment_advisor_commissions' UNION ALL
    SELECT 'investment_advisor_offer_visibility' UNION ALL
    SELECT 'investment_advisor_recommendations' UNION ALL
    SELECT 'investment_advisor_relationships' UNION ALL
    SELECT 'investment_offers' UNION ALL
    SELECT 'investor_favorites' UNION ALL
    SELECT 'startups' UNION ALL
    SELECT 'user_submitted_compliances'
)
SELECT 
    'Tables with FK to users(id) - Policy Status' as category,
    ft.tablename,
    COUNT(p.policyname) as policy_count,
    CASE 
        WHEN COUNT(p.policyname) = 0 THEN '❌ No policies'
        WHEN BOOL_OR(p.qual LIKE '%user_profiles%' OR p.with_check LIKE '%user_profiles%') THEN
            CASE 
                WHEN BOOL_OR(p.qual LIKE '%auth.uid()%' OR p.with_check LIKE '%auth.uid()%') THEN 
                    '✅ Uses auth.uid() (profile check for role only)'
                ELSE 
                    '⚠️ Allows profile IDs (needs fix)'
            END
        WHEN BOOL_OR(p.qual LIKE '%auth.uid()%' OR p.with_check LIKE '%auth.uid()%') THEN '✅ Uses auth.uid() only'
        ELSE '❓ Unknown pattern'
    END as status
FROM fk_tables ft
LEFT JOIN pg_policies p ON p.schemaname = 'public' AND p.tablename = ft.tablename
GROUP BY ft.tablename
ORDER BY 
    CASE 
        WHEN COUNT(p.policyname) = 0 THEN 0
        WHEN BOOL_OR(p.qual LIKE '%user_profiles%' OR p.with_check LIKE '%user_profiles%') 
            AND NOT BOOL_OR(p.qual LIKE '%auth.uid()%' OR p.with_check LIKE '%auth.uid()%') THEN 1
        ELSE 2
    END,
    ft.tablename;

-- Detailed check: Show policies that might still allow profile IDs
SELECT 
    '⚠️ Policies that might need review' as category,
    p.tablename,
    p.policyname,
    p.cmd,
    CASE 
        WHEN p.qual LIKE '%user_profiles%' OR p.with_check LIKE '%user_profiles%' THEN
            CASE 
                WHEN p.qual LIKE '%auth.uid()%' OR p.with_check LIKE '%auth.uid()%' THEN 
                    '✅ OK (profile check for role)'
                WHEN p.qual LIKE '%id::text%' OR p.with_check LIKE '%id::text%' THEN 
                    '⚠️ Uses profile ID (needs fix)'
                ELSE 
                    '⚠️ Uses user_profiles (needs review)'
            END
        ELSE '✅ OK'
    END as status,
    COALESCE(p.qual, 'N/A') as using_expression,
    COALESCE(p.with_check, 'N/A') as with_check_expression
FROM pg_policies p
WHERE p.schemaname = 'public'
AND p.tablename IN (
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
AND (p.qual LIKE '%user_profiles%' OR p.with_check LIKE '%user_profiles%')
ORDER BY 
    CASE 
        WHEN p.qual LIKE '%auth.uid()%' OR p.with_check LIKE '%auth.uid()%' THEN 1
        ELSE 0
    END,
    p.tablename,
    p.policyname;




