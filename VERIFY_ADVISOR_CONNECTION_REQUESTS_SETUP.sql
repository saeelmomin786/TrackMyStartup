-- =====================================================
-- VERIFY ADVISOR CONNECTION REQUESTS TABLE SETUP
-- =====================================================
-- Run this to verify the table, policies, and constraints are set up correctly

-- 1. Check if table exists
SELECT 
    CASE 
        WHEN EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'advisor_connection_requests')
        THEN '✅ Table exists'
        ELSE '❌ Table does NOT exist - Run CREATE_ADVISOR_CONNECTION_REQUESTS_TABLE.sql'
    END as table_status;

-- 2. Check table structure
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
    AND table_name = 'advisor_connection_requests'
ORDER BY ordinal_position;

-- 3. Check CHECK constraints
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'public.advisor_connection_requests'::regclass
    AND contype = 'c';

-- 4. Check RLS status
SELECT 
    tablename,
    CASE 
        WHEN rowsecurity THEN '✅ RLS Enabled'
        ELSE '❌ RLS Disabled'
    END as rls_status
FROM pg_tables
WHERE schemaname = 'public' 
    AND tablename = 'advisor_connection_requests';

-- 5. Check all policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd as command,
    qual as using_expression,
    with_check as with_check_expression
FROM pg_policies
WHERE schemaname = 'public' 
    AND tablename = 'advisor_connection_requests'
ORDER BY policyname;

-- 6. Check indexes
SELECT 
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public' 
    AND tablename = 'advisor_connection_requests'
ORDER BY indexname;

-- 7. Check triggers
SELECT 
    trigger_name,
    event_manipulation,
    action_statement
FROM information_schema.triggers
WHERE event_object_schema = 'public'
    AND event_object_table = 'advisor_connection_requests'
ORDER BY trigger_name;









