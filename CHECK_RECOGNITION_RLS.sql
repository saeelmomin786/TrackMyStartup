-- Check existing RLS policies specifically for recognition_records table

-- 1. Check if RLS is enabled
SELECT 
    'RLS STATUS' as check_type,
    tablename, 
    rowsecurity as "rls_enabled"
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'recognition_records';

-- 2. Check all existing policies on recognition_records
SELECT 
    'EXISTING POLICIES' as check_type,
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd as "command_type",
    qual as "using_expression",
    with_check as "with_check_expression"
FROM pg_policies
WHERE tablename = 'recognition_records'
ORDER BY policyname;

-- 3. If no results above, check if table even exists
SELECT 
    'TABLE EXISTS CHECK' as check_type,
    table_name,
    table_type
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name = 'recognition_records';

-- 4. Check table columns to confirm structure
SELECT 
    'TABLE COLUMNS' as check_type,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'recognition_records'
ORDER BY ordinal_position;
