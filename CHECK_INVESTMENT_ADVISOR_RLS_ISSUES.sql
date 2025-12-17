-- =====================================================
-- CHECK RLS POLICIES FOR INVESTMENT ADVISOR TABLES
-- =====================================================
-- Check if policies allow Investment Advisors to view their data
-- =====================================================

-- 1. Check due_diligence_requests policies
SELECT 
    'due_diligence_requests policies' as category,
    policyname,
    cmd,
    qual as using_expression,
    with_check as with_check_expression
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'due_diligence_requests'
ORDER BY policyname;

-- 2. Check investment_advisor_recommendations policies
SELECT 
    'investment_advisor_recommendations policies' as category,
    policyname,
    cmd,
    qual as using_expression,
    with_check as with_check_expression
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'investment_advisor_recommendations'
ORDER BY policyname;

-- 3. Check if due_diligence_requests.user_id is FK to users(id)
SELECT 
    'due_diligence_requests FK check' as category,
    tc.constraint_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema = 'public'
    AND tc.table_name = 'due_diligence_requests'
    AND kcu.column_name = 'user_id';

-- 4. Check if investment_advisor_recommendations.investment_advisor_id is FK to users(id)
SELECT 
    'investment_advisor_recommendations FK check' as category,
    tc.constraint_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema = 'public'
    AND tc.table_name = 'investment_advisor_recommendations'
    AND kcu.column_name = 'investment_advisor_id';

-- 5. Summary: Do policies use auth.uid()?
SELECT 
    'Policy Summary' as category,
    tablename,
    COUNT(*) as policy_count,
    CASE 
        WHEN BOOL_OR(qual LIKE '%auth.uid()%' OR with_check LIKE '%auth.uid()%') THEN '✅ Uses auth.uid()'
        WHEN BOOL_OR(qual LIKE '%user_id%' OR with_check LIKE '%user_id%') THEN '⚠️ Uses user_id (might need auth.uid())'
        ELSE '❓ Unknown pattern'
    END as status
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('due_diligence_requests', 'investment_advisor_recommendations')
GROUP BY tablename;





