-- =====================================================
-- CHECK POLICIES THAT NEED REVIEW
-- =====================================================
-- These policies were flagged for review - let's see what they actually do
-- =====================================================

-- 1. co_investment_opportunities - "Anyone can view active"
SELECT 
    'co_investment_opportunities - Anyone can view active' as policy_name,
    qual as using_expression,
    with_check as with_check_expression,
    CASE 
        WHEN qual LIKE '%status%' AND qual LIKE '%active%' THEN '✅ OK - Public viewing policy (no user ID check needed)'
        ELSE '❓ Review needed'
    END as status
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'co_investment_opportunities'
AND policyname = 'Anyone can view active co-investment opportunities';

-- 2. evaluators - "Users can view evaluators"
SELECT 
    'evaluators - Users can view evaluators' as policy_name,
    qual as using_expression,
    with_check as with_check_expression,
    CASE 
        WHEN qual IS NULL OR qual = 'true' THEN '✅ OK - Public viewing (all authenticated users can view)'
        WHEN qual LIKE '%auth.uid()%' THEN '✅ OK - Uses auth.uid()'
        ELSE '❓ Review needed'
    END as status
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'evaluators'
AND policyname = 'Users can view evaluators';

-- 3. investment_advisor_relationships - "Allow all authenticated users to manage relationships"
SELECT 
    'investment_advisor_relationships - Allow all authenticated users' as policy_name,
    qual as using_expression,
    with_check as with_check_expression,
    CASE 
        WHEN qual = 'true' OR qual IS NULL THEN '⚠️ Too permissive - allows all users to manage all relationships'
        WHEN qual LIKE '%auth.uid()%' THEN '✅ OK - Uses auth.uid()'
        ELSE '❓ Review needed'
    END as status
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'investment_advisor_relationships'
AND policyname = 'Allow all authenticated users to manage relationships';

-- 4. startups - "startups_select_all"
SELECT 
    'startups - startups_select_all' as policy_name,
    qual as using_expression,
    with_check as with_check_expression,
    CASE 
        WHEN qual = 'true' OR qual IS NULL THEN '✅ OK - Public viewing (all authenticated users can view all startups)'
        WHEN qual LIKE '%auth.uid()%' THEN '✅ OK - Uses auth.uid()'
        ELSE '❓ Review needed'
    END as status
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'startups'
AND policyname = 'startups_select_all';

-- Summary: Are these policies safe?
SELECT 
    'Summary' as category,
    tablename,
    policyname,
    CASE 
        WHEN tablename = 'co_investment_opportunities' AND policyname LIKE '%Anyone can view%' THEN '✅ Safe - Public viewing policy'
        WHEN tablename = 'evaluators' AND policyname LIKE '%Users can view%' THEN '✅ Safe - Public viewing policy'
        WHEN tablename = 'investment_advisor_relationships' AND policyname LIKE '%Allow all%' THEN '⚠️ Check - Might be too permissive'
        WHEN tablename = 'startups' AND policyname LIKE '%select_all%' THEN '✅ Safe - Public viewing policy'
        ELSE '❓ Review needed'
    END as recommendation
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('co_investment_opportunities', 'evaluators', 'investment_advisor_relationships', 'startups')
AND policyname IN (
    'Anyone can view active co-investment opportunities',
    'Users can view evaluators',
    'Allow all authenticated users to manage relationships',
    'startups_select_all'
);




