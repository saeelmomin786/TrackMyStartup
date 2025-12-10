-- =====================================================
-- VERIFY COLLABORATION SETUP - COMPLETE CHECK
-- =====================================================
-- PURPOSE: Verify both tables are correctly set up with all columns, indexes, and policies

-- 1. Check if both tables exist
SELECT 
    table_name,
    CASE 
        WHEN table_name = 'investor_connection_requests' THEN '✅ Collaboration Tab (Requests & Collaborators)'
        WHEN table_name = 'collaborator_recommendations' THEN '✅ Recommend Feature'
        ELSE '❓ Unknown'
    END as purpose,
    COUNT(*) as column_count
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name IN ('investor_connection_requests', 'collaborator_recommendations')
GROUP BY table_name
ORDER BY table_name;

-- 2. Check all columns in investor_connection_requests
SELECT 
    'investor_connection_requests' as table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'investor_connection_requests'
ORDER BY ordinal_position;

-- 3. Check all columns in collaborator_recommendations
SELECT 
    'collaborator_recommendations' as table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'collaborator_recommendations'
ORDER BY ordinal_position;

-- 4. Check RLS policies for investor_connection_requests
SELECT 
    'investor_connection_requests' as table_name,
    policyname,
    cmd as operation,
    CASE 
        WHEN cmd = 'SELECT' THEN '✅ Can view'
        WHEN cmd = 'INSERT' THEN '✅ Can create'
        WHEN cmd = 'UPDATE' THEN '✅ Can update'
        WHEN cmd = 'DELETE' THEN '✅ Can delete'
        ELSE cmd
    END as permission
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'investor_connection_requests'
ORDER BY policyname;

-- 5. Check RLS policies for collaborator_recommendations
SELECT 
    'collaborator_recommendations' as table_name,
    policyname,
    cmd as operation,
    CASE 
        WHEN cmd = 'SELECT' THEN '✅ Can view'
        WHEN cmd = 'INSERT' THEN '✅ Can create'
        WHEN cmd = 'UPDATE' THEN '✅ Can update'
        WHEN cmd = 'DELETE' THEN '✅ Can delete'
        ELSE cmd
    END as permission
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'collaborator_recommendations'
ORDER BY policyname;

-- 6. Check indexes
SELECT 
    tablename,
    indexname,
    CASE 
        WHEN indexname LIKE '%unique%' THEN '🔒 Unique Index'
        ELSE '📊 Regular Index'
    END as index_type
FROM pg_indexes
WHERE schemaname = 'public'
AND tablename IN ('investor_connection_requests', 'collaborator_recommendations')
ORDER BY tablename, indexname;

-- 7. Check constraints
SELECT 
    tc.table_name,
    tc.constraint_name,
    tc.constraint_type,
    cc.check_clause
FROM information_schema.table_constraints tc
LEFT JOIN information_schema.check_constraints cc 
    ON tc.constraint_name = cc.constraint_name
WHERE tc.table_schema = 'public'
AND tc.table_name IN ('investor_connection_requests', 'collaborator_recommendations')
ORDER BY tc.table_name, tc.constraint_type;

-- 8. Summary
SELECT 
    '✅ Setup Complete!' as status,
    (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'investor_connection_requests') as investor_connection_requests_exists,
    (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'collaborator_recommendations') as collaborator_recommendations_exists,
    (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public' AND tablename = 'investor_connection_requests') as investor_connection_requests_policies,
    (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public' AND tablename = 'collaborator_recommendations') as collaborator_recommendations_policies;




