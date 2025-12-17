-- =====================================================
-- CHECK ALL COLUMNS IN USERS TABLE
-- =====================================================
-- This will show you ALL columns that exist in your users table
-- Run this and share the results
-- =====================================================

-- Get ALL columns with their details
SELECT 
    column_name as "Column Name",
    data_type as "Data Type",
    is_nullable as "Nullable",
    column_default as "Default Value",
    ordinal_position as "Position"
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'users'
ORDER BY ordinal_position;

-- Summary: Count of columns
SELECT 
    COUNT(*) as "Total Columns in users table"
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'users';

-- List all column names in a simple format (easy to copy)
SELECT 
    string_agg(column_name, ', ' ORDER BY ordinal_position) as "All Column Names"
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'users';

