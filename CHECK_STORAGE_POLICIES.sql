-- Check current RLS policies on storage.objects table for startup-documents bucket

-- 1. Check if RLS is enabled on storage.objects
SELECT 
    'RLS STATUS' as check_type,
    tablename,
    rowsecurity as "rls_enabled"
FROM pg_tables
WHERE schemaname = 'storage'
AND tablename = 'objects';

-- 2. Check ALL policies on storage.objects
SELECT 
    'ALL STORAGE POLICIES' as check_type,
    policyname as "Policy_Name",
    cmd as "Command",
    CASE 
        WHEN qual LIKE '%startup%' OR qual LIKE '%startup-documents%' THEN '✅ Startup related'
        ELSE 'Other'
    END as "Policy_Type",
    LEFT(qual, 100) as "Using_Expression_Preview"
FROM pg_policies
WHERE schemaname = 'storage'
AND tablename = 'objects'
ORDER BY policyname;

-- 3. Check specifically for startup-documents bucket policies
SELECT 
    'STARTUP-DOCUMENTS BUCKET POLICIES' as check_type,
    policyname as "Policy_Name",
    cmd as "Command",
    qual as "Using_Condition",
    with_check as "With_Check_Condition"
FROM pg_policies
WHERE schemaname = 'storage'
AND tablename = 'objects'
AND (qual LIKE '%startup-documents%' OR with_check LIKE '%startup-documents%')
ORDER BY policyname;
