-- =====================================================
-- DIAGNOSE EMPLOYEES_INCREMENTS ISSUE
-- =====================================================
-- This script checks if the table exists and identifies the actual problem

-- 1. Check if employees_increments table exists
SELECT 
    '=== TABLE EXISTENCE CHECK ===' as section,
    CASE 
        WHEN EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'employees_increments'
        ) THEN '✅ Table EXISTS'
        ELSE '❌ Table DOES NOT EXIST'
    END as table_status;

-- 2. If table exists, show its structure
SELECT 
    '=== TABLE STRUCTURE (if exists) ===' as section,
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'employees_increments' 
ORDER BY ordinal_position;

-- 3. Check RLS status
SELECT 
    '=== RLS STATUS ===' as section,
    tablename,
    rowsecurity as rls_enabled,
    CASE 
        WHEN rowsecurity THEN 'RLS is ENABLED'
        ELSE 'RLS is DISABLED'
    END as rls_status
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename = 'employees_increments';

-- 4. Check RLS policies
SELECT 
    '=== RLS POLICIES ===' as section,
    schemaname,
    tablename,
    policyname,
    cmd as command_type,
    CASE 
        WHEN cmd = 'SELECT' THEN 'Can read'
        WHEN cmd = 'INSERT' THEN 'Can insert'
        WHEN cmd = 'UPDATE' THEN 'Can update'
        WHEN cmd = 'DELETE' THEN 'Can delete'
        WHEN cmd = 'ALL' THEN 'Full access'
        ELSE cmd::text
    END as permission
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'employees_increments'
ORDER BY policyname;

-- 5. Check if get_employee_current_salary function exists and its definition
SELECT 
    '=== FUNCTION CHECK ===' as section,
    CASE 
        WHEN EXISTS (
            SELECT FROM pg_proc p
            JOIN pg_namespace n ON p.pronamespace = n.oid
            WHERE n.nspname = 'public'
            AND p.proname = 'get_employee_current_salary'
        ) THEN '✅ Function EXISTS'
        ELSE '❌ Function DOES NOT EXIST'
    END as function_status;

-- 6. Show function definition if it exists
SELECT 
    '=== FUNCTION DEFINITION ===' as section,
    p.proname as function_name,
    pg_get_functiondef(p.oid) as function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname = 'get_employee_current_salary';

-- 7. Check triggers on employees table
SELECT 
    '=== TRIGGERS ON EMPLOYEES TABLE ===' as section,
    tgname as trigger_name,
    tgtype::text as trigger_type,
    CASE 
        WHEN tgtype & 2 = 2 THEN 'BEFORE'
        WHEN tgtype & 64 = 64 THEN 'INSTEAD OF'
        ELSE 'AFTER'
    END as timing,
    CASE 
        WHEN tgtype & 4 = 4 THEN 'INSERT'
        WHEN tgtype & 8 = 8 THEN 'DELETE'
        WHEN tgtype & 16 = 16 THEN 'UPDATE'
        ELSE 'UNKNOWN'
    END as event,
    pg_get_triggerdef(oid) as trigger_definition
FROM pg_trigger
WHERE tgrelid = 'public.employees'::regclass
  AND NOT tgisinternal
ORDER BY tgname;

-- 8. Check if there are any foreign key constraints referencing employees_increments
SELECT 
    '=== FOREIGN KEY CONSTRAINTS ===' as section,
    tc.constraint_name,
    tc.table_name as referencing_table,
    kcu.column_name as referencing_column,
    ccu.table_name as referenced_table,
    ccu.column_name as referenced_column
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND (ccu.table_name = 'employees_increments' OR tc.table_name = 'employees_increments')
ORDER BY tc.table_name, tc.constraint_name;

-- 9. Check permissions on the table (if it exists)
DO $$
DECLARE
    table_exists BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'employees_increments'
    ) INTO table_exists;
    
    IF table_exists THEN
        RAISE NOTICE '=== TABLE PERMISSIONS ===';
        RAISE NOTICE 'Table exists, checking permissions...';
    ELSE
        RAISE NOTICE '=== TABLE PERMISSIONS ===';
        RAISE NOTICE 'Table does not exist, cannot check permissions';
    END IF;
END $$;

-- 10. Test query to employees_increments (if table exists)
DO $$
DECLARE
    table_exists BOOLEAN;
    test_result TEXT;
BEGIN
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'employees_increments'
    ) INTO table_exists;
    
    IF table_exists THEN
        BEGIN
            PERFORM 1 FROM public.employees_increments LIMIT 1;
            RAISE NOTICE '=== TEST QUERY ===';
            RAISE NOTICE '✅ Can query employees_increments table';
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE '=== TEST QUERY ===';
            RAISE NOTICE '❌ Cannot query employees_increments table: %', SQLERRM;
        END;
    ELSE
        RAISE NOTICE '=== TEST QUERY ===';
        RAISE NOTICE 'Table does not exist, cannot test query';
    END IF;
END $$;

-- 11. Check if employees table exists and has data
SELECT 
    '=== EMPLOYEES TABLE STATUS ===' as section,
    CASE 
        WHEN EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'employees'
        ) THEN '✅ Table EXISTS'
        ELSE '❌ Table DOES NOT EXIST'
    END as employees_table_status,
    (SELECT COUNT(*) FROM public.employees) as employee_count;

-- 12. Summary
SELECT 
    '=== DIAGNOSIS SUMMARY ===' as section,
    CASE 
        WHEN EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'employees_increments'
        ) THEN 
            CASE 
                WHEN EXISTS (
                    SELECT FROM pg_policies
                    WHERE schemaname = 'public'
                    AND tablename = 'employees_increments'
                ) THEN 'Table exists with RLS policies - Issue might be permissions or RLS policy'
                WHEN EXISTS (
                    SELECT FROM pg_tables 
                    WHERE schemaname = 'public' 
                    AND tablename = 'employees_increments'
                    AND rowsecurity = true
                ) THEN 'Table exists with RLS enabled but NO policies - This is the problem!'
                ELSE 'Table exists but RLS might be disabled - Check RLS status'
            END
        ELSE 'Table DOES NOT EXIST - This is the problem!'
    END as diagnosis;

