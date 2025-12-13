-- =====================================================
-- VERIFICATION SCRIPT FOR COLLABORATOR_RECOMMENDATIONS
-- =====================================================
-- Run this in Supabase SQL Editor to verify everything is set up correctly

-- 1. Check if table exists
SELECT 
    'Table exists' as check_item,
    CASE WHEN EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'collaborator_recommendations'
    ) THEN '✓ PASS' ELSE '✗ FAIL' END as status;

-- 2. Check RLS is enabled
SELECT 
    'RLS enabled' as check_item,
    CASE WHEN EXISTS (
        SELECT FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename = 'collaborator_recommendations'
        AND rowsecurity = true
    ) THEN '✓ PASS' ELSE '✗ FAIL' END as status;

-- 3. Check policies exist (should have 5 policies)
SELECT 
    'Policies count' as check_item,
    COUNT(*)::text || ' policies found (expected: 5)' as status
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'collaborator_recommendations';

-- 4. List all policies
SELECT 
    'Policy: ' || policyname as check_item,
    '✓ EXISTS' as status
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'collaborator_recommendations'
ORDER BY policyname;

-- 5. Check indexes exist (should have 6 indexes)
SELECT 
    'Indexes count' as check_item,
    COUNT(*)::text || ' indexes found (expected: 6)' as status
FROM pg_indexes 
WHERE schemaname = 'public' 
AND tablename = 'collaborator_recommendations';

-- 6. List all indexes
SELECT 
    'Index: ' || indexname as check_item,
    '✓ EXISTS' as status
FROM pg_indexes 
WHERE schemaname = 'public' 
AND tablename = 'collaborator_recommendations'
ORDER BY indexname;

-- 7. Check trigger exists
SELECT 
    'Trigger exists' as check_item,
    CASE WHEN EXISTS (
        SELECT FROM pg_trigger 
        WHERE tgname = 'update_collaborator_recommendations_updated_at'
    ) THEN '✓ PASS' ELSE '✗ FAIL' END as status;

-- 8. Check function exists
SELECT 
    'Function exists' as check_item,
    CASE WHEN EXISTS (
        SELECT FROM pg_proc 
        WHERE proname = 'update_collaborator_recommendations_updated_at'
    ) THEN '✓ PASS' ELSE '✗ FAIL' END as status;

-- 9. Check foreign key constraints
SELECT 
    'Foreign keys' as check_item,
    COUNT(*)::text || ' foreign keys found (expected: 3)' as status
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
WHERE tc.table_schema = 'public'
AND tc.table_name = 'collaborator_recommendations'
AND tc.constraint_type = 'FOREIGN KEY';

-- 10. List foreign key constraints
SELECT 
    'FK: ' || tc.constraint_name as check_item,
    kcu.column_name || ' → ' || ccu.table_name || '.' || ccu.column_name as status
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage ccu 
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.table_schema = 'public'
AND tc.table_name = 'collaborator_recommendations'
AND tc.constraint_type = 'FOREIGN KEY'
ORDER BY tc.constraint_name;

-- 11. Summary check
SELECT 
    '=== SUMMARY ===' as check_item,
    '' as status
UNION ALL
SELECT 
    'Table: collaborator_recommendations' as check_item,
    CASE WHEN EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'collaborator_recommendations'
    ) THEN '✓ EXISTS' ELSE '✗ MISSING' END as status
UNION ALL
SELECT 
    'RLS: Enabled' as check_item,
    CASE WHEN EXISTS (
        SELECT FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename = 'collaborator_recommendations'
        AND rowsecurity = true
    ) THEN '✓ YES' ELSE '✗ NO' END as status
UNION ALL
SELECT 
    'Policies: ' || COUNT(*)::text as check_item,
    CASE WHEN COUNT(*) = 5 THEN '✓ ALL 5' ELSE '✗ MISSING' END as status
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'collaborator_recommendations'
UNION ALL
SELECT 
    'Indexes: ' || COUNT(*)::text as check_item,
    CASE WHEN COUNT(*) >= 6 THEN '✓ ALL' ELSE '✗ MISSING' END as status
FROM pg_indexes 
WHERE schemaname = 'public' 
AND tablename = 'collaborator_recommendations'
UNION ALL
SELECT 
    'Trigger: update_updated_at' as check_item,
    CASE WHEN EXISTS (
        SELECT FROM pg_trigger 
        WHERE tgname = 'update_collaborator_recommendations_updated_at'
    ) THEN '✓ EXISTS' ELSE '✗ MISSING' END as status
UNION ALL
SELECT 
    'Function: update_updated_at' as check_item,
    CASE WHEN EXISTS (
        SELECT FROM pg_proc 
        WHERE proname = 'update_collaborator_recommendations_updated_at'
    ) THEN '✓ EXISTS' ELSE '✗ MISSING' END as status;


