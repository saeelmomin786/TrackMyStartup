-- =====================================================
-- DIAGNOSTIC: Verify Storage Calculation
-- =====================================================
-- Run this to check why storage shows 0 MB
-- =====================================================

-- 1. Check if get_user_storage_total function exists
SELECT 
    routine_name,
    routine_type,
    security_type
FROM information_schema.routines
WHERE routine_name = 'get_user_storage_total'
AND routine_schema = 'public';

-- 2. Check total records in user_storage_usage
SELECT 
    COUNT(*) as total_files,
    COUNT(DISTINCT user_id) as unique_users,
    SUM(file_size_mb) as total_storage_mb,
    AVG(file_size_mb) as avg_file_size_mb
FROM user_storage_usage;

-- 3. Check storage per user (top 10)
SELECT 
    user_id,
    COUNT(*) as file_count,
    SUM(file_size_mb) as total_mb,
    MIN(created_at) as first_upload,
    MAX(created_at) as last_upload
FROM user_storage_usage
GROUP BY user_id
ORDER BY total_mb DESC
LIMIT 10;

-- 4. Test the RPC function with a real user_id
-- Replace 'YOUR_USER_ID_HERE' with an actual user_id from the query above
SELECT 
    user_id,
    get_user_storage_total(user_id) as calculated_storage_mb
FROM (
    SELECT DISTINCT user_id 
    FROM user_storage_usage 
    LIMIT 5
) as test_users;

-- 5. Check if RLS is blocking the function
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies
WHERE tablename = 'user_storage_usage';

-- 6. Check function permissions
SELECT 
    p.proname as function_name,
    pg_get_function_identity_arguments(p.oid) as arguments,
    CASE p.prosecdef 
        WHEN true THEN 'SECURITY DEFINER'
        ELSE 'SECURITY INVOKER'
    END as security_type
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.proname = 'get_user_storage_total'
AND n.nspname = 'public';

-- 7. Verify data exists for a specific user (replace with actual user_id)
-- SELECT 
--     id,
--     user_id,
--     file_name,
--     file_size_mb,
--     storage_location,
--     created_at
-- FROM user_storage_usage
-- WHERE user_id = 'YOUR_USER_ID_HERE'
-- ORDER BY created_at DESC
-- LIMIT 10;
