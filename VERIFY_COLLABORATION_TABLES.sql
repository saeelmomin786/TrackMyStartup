-- =====================================================
-- VERIFY COLLABORATION TABLES SETUP
-- =====================================================
-- PURPOSE: Verify that both tables are correctly set up for Collaboration tab
--          and Recommendation flow

-- 1. Check investor_connection_requests table structure
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

-- 2. Check collaborator_recommendations table structure
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

-- 3. Check RLS policies for investor_connection_requests
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'investor_connection_requests'
ORDER BY policyname;

-- 4. Check RLS policies for collaborator_recommendations
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'collaborator_recommendations'
ORDER BY policyname;

-- 5. Check indexes
SELECT 
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
AND tablename IN ('investor_connection_requests', 'collaborator_recommendations')
ORDER BY tablename, indexname;

-- 6. Check constraints
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



