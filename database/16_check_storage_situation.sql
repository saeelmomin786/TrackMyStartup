-- =====================================================
-- DIAGNOSTIC: Check Storage Situation
-- =====================================================
-- Run this first to understand your database state
-- =====================================================

-- 1. Check user_subscriptions table
SELECT 
    'user_subscriptions' as check_type,
    COUNT(*) as total_rows,
    COUNT(DISTINCT user_id) as unique_users,
    COUNT(CASE WHEN status = 'active' THEN 1 END) as active_count,
    COUNT(CASE WHEN status = 'inactive' THEN 1 END) as inactive_count,
    COUNT(CASE WHEN status IS NULL THEN 1 END) as null_status_count,
    COUNT(CASE WHEN storage_used_mb IS NOT NULL THEN 1 END) as with_storage_count
FROM user_subscriptions;

-- 2. Check user_storage_usage table
SELECT 
    'user_storage_usage' as check_type,
    COUNT(DISTINCT user_id) as users_with_files,
    COUNT(*) as total_files,
    ROUND(SUM(file_size_mb), 2) as total_storage_mb
FROM user_storage_usage;

-- 3. Check users with files but no subscription
SELECT 
    'users_with_files_no_subscription' as check_type,
    COUNT(DISTINCT usu.user_id) as count
FROM user_storage_usage usu
WHERE NOT EXISTS (
    SELECT 1 
    FROM user_subscriptions 
    WHERE user_id = usu.user_id
);

-- 4. Check users with subscription but no files
SELECT 
    'users_with_subscription_no_files' as check_type,
    COUNT(DISTINCT us.user_id) as count
FROM user_subscriptions us
WHERE NOT EXISTS (
    SELECT 1 
    FROM user_storage_usage 
    WHERE user_id = us.user_id
);

-- 5. Show sample data
SELECT 
    'Sample: user_subscriptions' as info,
    user_id,
    status,
    plan_tier,
    storage_used_mb,
    created_at
FROM user_subscriptions
ORDER BY created_at DESC
LIMIT 5;

SELECT 
    'Sample: user_storage_usage' as info,
    user_id,
    COUNT(*) as file_count,
    ROUND(SUM(file_size_mb), 2) as total_mb
FROM user_storage_usage
GROUP BY user_id
ORDER BY total_mb DESC
LIMIT 5;
