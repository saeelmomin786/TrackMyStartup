-- =====================================================
-- CHECK ALL COLUMNS IN USERS TABLE
-- =====================================================
-- This query shows all columns in the users table with their details
-- Run this in your Supabase SQL Editor
-- =====================================================

-- Option 1: Simple list of column names
SELECT 
    column_name as "Column Name"
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'users'
ORDER BY ordinal_position;

-- Option 2: Detailed column information
SELECT 
    column_name as "Column Name",
    data_type as "Data Type",
    character_maximum_length as "Max Length",
    is_nullable as "Nullable",
    column_default as "Default Value",
    ordinal_position as "Position"
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'users'
ORDER BY ordinal_position;

-- Option 3: Count of columns
SELECT 
    COUNT(*) as "Total Columns in users table"
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'users';

-- Option 4: All column names in a comma-separated list (easy to copy)
SELECT 
    string_agg(column_name, ', ' ORDER BY ordinal_position) as "All Column Names"
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'users';

-- Option 5: Compare with user_profiles table (shows what's missing)
SELECT 
    u.column_name as "Column in users",
    CASE 
        WHEN up.column_name IS NOT NULL THEN '✅ Also in user_profiles'
        ELSE '❌ NOT in user_profiles'
    END as "Status in user_profiles",
    u.data_type as "Data Type"
FROM information_schema.columns u
LEFT JOIN information_schema.columns up 
    ON u.column_name = up.column_name 
    AND up.table_schema = 'public' 
    AND up.table_name = 'user_profiles'
WHERE u.table_schema = 'public' 
  AND u.table_name = 'users'
  AND u.column_name != 'id' -- Exclude primary key
ORDER BY 
    CASE WHEN up.column_name IS NULL THEN 0 ELSE 1 END, -- Missing columns first
    u.column_name;




