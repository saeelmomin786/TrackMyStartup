-- =====================================================
-- TEST RLS POLICIES FOR A SINGLE TABLE
-- =====================================================
-- INSTRUCTIONS:
-- 1. Find the line: test_table TEXT := 'YOUR_TABLE_NAME';
-- 2. Replace 'YOUR_TABLE_NAME' with your actual table name
-- 3. Run the script to see policy details
-- =====================================================

DO $$
DECLARE
    -- ⬇️ CHANGE THIS LINE - Replace 'YOUR_TABLE_NAME' with your table name ⬇️
    test_table TEXT := 'YOUR_TABLE_NAME';
    -- ⬆️ CHANGE THIS LINE ⬆️
BEGIN

    RAISE NOTICE 'Testing table: %', test_table;
END $$;

-- Show all policies for the table
SELECT 
    'Policy Details' as info,
    policyname,
    cmd as operation,
    permissive,
    roles,
    LEFT(qual, 100) as using_clause_preview,
    LEFT(with_check, 100) as with_check_clause_preview
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'YOUR_TABLE_NAME'  -- Change this to your table name
ORDER BY 
    CASE cmd
        WHEN 'INSERT' THEN 1
        WHEN 'SELECT' THEN 2
        WHEN 'UPDATE' THEN 3
        WHEN 'DELETE' THEN 4
    END;

-- Show table structure
SELECT 
    'Table Structure' as info,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'YOUR_TABLE_NAME'  -- Change this to your table name
ORDER BY ordinal_position;

-- Show foreign key constraints
SELECT 
    'Foreign Keys' as info,
    tc.constraint_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema = 'public'
    AND tc.table_name = 'YOUR_TABLE_NAME';  -- Change this to your table name

