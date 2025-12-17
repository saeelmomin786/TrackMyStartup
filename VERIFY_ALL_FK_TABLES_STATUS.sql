-- =====================================================
-- VERIFY ALL 15 TABLES WITH FK TO users(id)
-- =====================================================
-- Check if all tables have correct policies (use auth.uid(), not profile IDs)
-- =====================================================

-- Summary: Status of all 15 tables
SELECT 
    'Summary: All FK to users(id) tables' as category,
    ft.tablename,
    COUNT(p.policyname) as policy_count,
    CASE 
        WHEN COUNT(p.policyname) = 0 THEN '❌ No policies'
        WHEN BOOL_OR(
            (p.qual LIKE '%user_profiles%' OR p.with_check LIKE '%user_profiles%')
            AND NOT (p.qual LIKE '%auth.uid()%' OR p.with_check LIKE '%auth.uid()%')
            AND (p.qual LIKE '%id::text%' OR p.with_check LIKE '%id::text%' OR p.qual LIKE '%up.id%' OR p.with_check LIKE '%up.id%')
        ) THEN '⚠️ Allows profile IDs (needs fix)'
        WHEN BOOL_OR(p.qual LIKE '%auth.uid()%' OR p.with_check LIKE '%auth.uid()%') THEN 
            CASE 
                WHEN BOOL_OR(p.qual LIKE '%user_profiles%' OR p.with_check LIKE '%user_profiles%') THEN 
                    '✅ Uses auth.uid() (profile check for role only)'
                ELSE 
                    '✅ Uses auth.uid() only'
            END
        ELSE '❓ Unknown pattern'
    END as status
FROM (
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
) ft
LEFT JOIN pg_policies p ON p.schemaname = 'public' AND p.tablename = ft.tablename
GROUP BY ft.tablename
ORDER BY 
    CASE 
        WHEN COUNT(p.policyname) = 0 THEN 0
        WHEN BOOL_OR(
            (p.qual LIKE '%user_profiles%' OR p.with_check LIKE '%user_profiles%')
            AND NOT (p.qual LIKE '%auth.uid()%' OR p.with_check LIKE '%auth.uid()%')
            AND (p.qual LIKE '%id::text%' OR p.with_check LIKE '%id::text%' OR p.qual LIKE '%up.id%' OR p.with_check LIKE '%up.id%')
        ) THEN 1
        ELSE 2
    END,
    ft.tablename;

-- Detailed: Show policies that might still allow profile IDs
SELECT 
    '⚠️ Policies that might need review' as category,
    p.tablename,
    p.policyname,
    p.cmd,
    CASE 
        WHEN (p.qual LIKE '%user_profiles%' OR p.with_check LIKE '%user_profiles%')
            AND NOT (p.qual LIKE '%auth.uid()%' OR p.with_check LIKE '%auth.uid()%')
            AND (p.qual LIKE '%id::text%' OR p.with_check LIKE '%id::text%' OR p.qual LIKE '%up.id%' OR p.with_check LIKE '%up.id%') THEN 
            '⚠️ Uses profile ID (needs fix)'
        WHEN (p.qual LIKE '%user_profiles%' OR p.with_check LIKE '%user_profiles%')
            AND (p.qual LIKE '%auth.uid()%' OR p.with_check LIKE '%auth.uid()%') THEN 
            '✅ OK (profile check for role)'
        WHEN p.qual LIKE '%auth.uid()%' OR p.with_check LIKE '%auth.uid()%' THEN 
            '✅ OK (uses auth.uid())'
        ELSE 
            '❓ Review needed'
    END as status
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
ORDER BY 
    CASE 
        WHEN (p.qual LIKE '%user_profiles%' OR p.with_check LIKE '%user_profiles%')
            AND NOT (p.qual LIKE '%auth.uid()%' OR p.with_check LIKE '%auth.uid()%')
            AND (p.qual LIKE '%id::text%' OR p.with_check LIKE '%id::text%' OR p.qual LIKE '%up.id%' OR p.with_check LIKE '%up.id%') THEN 0
        ELSE 1
    END,
    p.tablename,
    p.policyname;





