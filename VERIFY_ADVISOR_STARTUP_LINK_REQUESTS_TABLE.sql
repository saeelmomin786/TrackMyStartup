-- =====================================================
-- VERIFY ADVISOR STARTUP LINK REQUESTS TABLE STRUCTURE
-- =====================================================
-- Run this to check if the table structure is correct

-- 1. Check if table exists
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'advisor_startup_link_requests'
        ) THEN '✅ Table EXISTS'
        ELSE '❌ Table DOES NOT EXIST'
    END as table_status;

-- 2. Check column data types
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'advisor_startup_link_requests'
ORDER BY ordinal_position;

-- 3. Check if advisor_id and startup_user_id are UUID (should be, not VARCHAR)
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'advisor_startup_link_requests'
            AND column_name = 'advisor_id'
            AND data_type = 'uuid'
        ) THEN '✅ advisor_id is UUID (CORRECT)'
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'advisor_startup_link_requests'
            AND column_name = 'advisor_id'
            AND data_type = 'character varying'
        ) THEN '❌ advisor_id is VARCHAR (NEEDS FIX)'
        ELSE '❌ advisor_id column not found'
    END as advisor_id_check,
    
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'advisor_startup_link_requests'
            AND column_name = 'startup_user_id'
            AND data_type = 'uuid'
        ) THEN '✅ startup_user_id is UUID (CORRECT)'
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'advisor_startup_link_requests'
            AND column_name = 'startup_user_id'
            AND data_type = 'character varying'
        ) THEN '❌ startup_user_id is VARCHAR (NEEDS FIX)'
        ELSE '❌ startup_user_id column not found'
    END as startup_user_id_check;

-- 4. Check indexes
SELECT 
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename = 'advisor_startup_link_requests'
ORDER BY indexname;

-- 5. Check RLS policies
SELECT 
    policyname,
    cmd as command,
    qual as using_expression,
    with_check as with_check_expression
FROM pg_policies 
WHERE tablename = 'advisor_startup_link_requests'
ORDER BY policyname;

-- 6. Check if RLS is enabled
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_tables 
            WHERE schemaname = 'public' 
            AND tablename = 'advisor_startup_link_requests'
            AND rowsecurity = true
        ) THEN '✅ RLS is ENABLED'
        ELSE '❌ RLS is DISABLED'
    END as rls_status;

-- 7. Check trigger
SELECT 
    trigger_name,
    event_manipulation,
    action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'advisor_startup_link_requests';


