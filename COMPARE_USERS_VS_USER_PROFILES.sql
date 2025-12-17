-- =====================================================
-- COMPARE USERS TABLE VS USER_PROFILES TABLE
-- =====================================================
-- This query compares columns between users and user_profiles tables
-- Run this in your Supabase SQL Editor
-- =====================================================

-- Check which columns from users are in user_profiles
SELECT 
    u.column_name as "Column in users",
    CASE 
        WHEN up.column_name IS NOT NULL THEN '✅ EXISTS in user_profiles'
        ELSE '❌ MISSING in user_profiles'
    END as "Status",
    u.data_type as "Data Type"
FROM information_schema.columns u
LEFT JOIN information_schema.columns up 
    ON u.column_name = up.column_name 
    AND up.table_schema = 'public' 
    AND up.table_name = 'user_profiles'
WHERE u.table_schema = 'public' 
  AND u.table_name = 'users'
  AND u.column_name != 'id' -- Exclude primary key (different structure)
ORDER BY 
    CASE WHEN up.column_name IS NULL THEN 0 ELSE 1 END, -- Missing columns first
    u.column_name;

-- Summary: Count missing columns
SELECT 
    'Summary' as info,
    COUNT(*) FILTER (WHERE up.column_name IS NULL) as "Missing Columns",
    COUNT(*) FILTER (WHERE up.column_name IS NOT NULL) as "Present Columns",
    COUNT(*) as "Total Columns (excluding id)"
FROM information_schema.columns u
LEFT JOIN information_schema.columns up 
    ON u.column_name = up.column_name 
    AND up.table_schema = 'public' 
    AND up.table_name = 'user_profiles'
WHERE u.table_schema = 'public' 
  AND u.table_name = 'users'
  AND u.column_name != 'id';

-- Show columns that are ONLY in user_profiles (not in users)
SELECT 
    up.column_name as "Column ONLY in user_profiles",
    up.data_type as "Data Type"
FROM information_schema.columns up
LEFT JOIN information_schema.columns u
    ON up.column_name = u.column_name 
    AND u.table_schema = 'public' 
    AND u.table_name = 'users'
WHERE up.table_schema = 'public' 
  AND up.table_name = 'user_profiles'
  AND u.column_name IS NULL
  AND up.column_name NOT IN ('id', 'auth_user_id') -- Exclude profile-specific columns
ORDER BY up.column_name;




