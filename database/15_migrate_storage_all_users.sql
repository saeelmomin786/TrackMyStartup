-- =====================================================
-- MIGRATE STORAGE: For All Users (Regardless of Subscription Status)
-- =====================================================
-- Use this if user_subscriptions table is empty or users don't have active subscriptions
-- This calculates storage for ALL users who have files in user_storage_usage
-- =====================================================

-- =====================================================
-- STEP 1: Check Current Situation
-- =====================================================

-- Check if user_subscriptions table has any data
SELECT 
    'user_subscriptions' as table_name,
    COUNT(*) as total_rows,
    COUNT(DISTINCT user_id) as unique_users,
    COUNT(CASE WHEN status = 'active' THEN 1 END) as active_subscriptions
FROM user_subscriptions;

-- Check users with storage files
SELECT 
    'user_storage_usage' as table_name,
    COUNT(DISTINCT user_id) as users_with_files,
    COUNT(*) as total_files,
    ROUND(SUM(file_size_mb), 2) as total_storage_mb
FROM user_storage_usage;

-- =====================================================
-- STEP 2: Option A - Update Existing Subscriptions
-- =====================================================
-- If user_subscriptions exists but no active ones, update all statuses

UPDATE user_subscriptions us
SET 
    storage_used_mb = (
        SELECT COALESCE(SUM(file_size_mb), 0)
        FROM user_storage_usage
        WHERE user_id = us.user_id
    ),
    updated_at = NOW()
WHERE EXISTS (
    SELECT 1 
    FROM user_storage_usage 
    WHERE user_id = us.user_id
);

-- =====================================================
-- STEP 2: Option B - Create/Update Storage for All Users with Files
-- =====================================================
-- If user_subscriptions doesn't exist or is empty, 
-- we'll update storage_used_mb directly for users who have files

-- First, ensure storage_used_mb column exists
ALTER TABLE user_subscriptions 
ADD COLUMN IF NOT EXISTS storage_used_mb DECIMAL(10,2) DEFAULT 0;

-- Update storage for all users who have files (regardless of subscription status)
UPDATE user_subscriptions us
SET 
    storage_used_mb = COALESCE((
        SELECT SUM(file_size_mb)
        FROM user_storage_usage
        WHERE user_id = us.user_id
    ), 0),
    updated_at = NOW()
WHERE EXISTS (
    SELECT 1 
    FROM user_storage_usage 
    WHERE user_id = us.user_id
);

-- =====================================================
-- STEP 3: Alternative - Calculate for Users Without Subscriptions
-- =====================================================
-- If some users have files but no subscription record,
-- we can still calculate their storage (but can't store in user_subscriptions)

-- Get storage for users who have files but no subscription
SELECT 
    usu.user_id,
    ROUND(SUM(usu.file_size_mb), 2) as storage_mb,
    COUNT(*) as file_count
FROM user_storage_usage usu
WHERE NOT EXISTS (
    SELECT 1 
    FROM user_subscriptions 
    WHERE user_id = usu.user_id
)
GROUP BY usu.user_id
ORDER BY storage_mb DESC;

-- =====================================================
-- STEP 4: Verify Results
-- =====================================================

SELECT 
    COUNT(*) as total_subscriptions,
    COUNT(storage_used_mb) as subscriptions_with_storage,
    COUNT(CASE WHEN storage_used_mb > 0 THEN 1 END) as subscriptions_with_files,
    ROUND(AVG(storage_used_mb), 2) as avg_storage_mb,
    ROUND(MAX(storage_used_mb), 2) as max_storage_mb,
    ROUND(SUM(storage_used_mb), 2) as total_storage_mb
FROM user_subscriptions;

-- Show users with storage
SELECT 
    user_id,
    status,
    plan_tier,
    storage_used_mb,
    updated_at
FROM user_subscriptions
WHERE storage_used_mb > 0
ORDER BY storage_used_mb DESC
LIMIT 20;

-- =====================================================
-- NOTES:
-- =====================================================
-- If you got 0 total_users, it means:
-- 1. user_subscriptions table is empty, OR
-- 2. All subscriptions have status != 'active'
-- 
-- This script handles both cases:
-- - Updates storage for existing subscriptions (any status)
-- - Shows users with files but no subscription record
-- =====================================================
