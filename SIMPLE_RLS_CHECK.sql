-- Simple check for RLS status and existing policies on recognition_records

-- Check if RLS is enabled
SELECT 
    tablename, 
    rowsecurity as "RLS_Enabled"
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'recognition_records';

-- Check existing policies
SELECT 
    policyname as "Policy_Name",
    cmd as "Command",
    qual as "USING_Condition",
    with_check as "WITH_CHECK_Condition"
FROM pg_policies
WHERE tablename = 'recognition_records'
ORDER BY policyname;
