-- =====================================================
-- QUICK MIGRATION: One-Line Storage Calculation
-- =====================================================
-- Simplest way to migrate all users
-- Just run this single query in Supabase SQL Editor
-- =====================================================

-- Update storage for ALL users (regardless of subscription status)
-- This works even if there are no active subscriptions
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

-- Verify results (all subscriptions, not just active)
SELECT 
    COUNT(*) as total_subscriptions,
    COUNT(storage_used_mb) as subscriptions_with_storage,
    COUNT(CASE WHEN storage_used_mb > 0 THEN 1 END) as subscriptions_with_files,
    ROUND(AVG(storage_used_mb), 2) as avg_storage_mb,
    ROUND(MAX(storage_used_mb), 2) as max_storage_mb,
    ROUND(SUM(storage_used_mb), 2) as total_storage_mb
FROM user_subscriptions;

-- Show breakdown by status
SELECT 
    status,
    COUNT(*) as count,
    COUNT(CASE WHEN storage_used_mb > 0 THEN 1 END) as with_files,
    ROUND(AVG(storage_used_mb), 2) as avg_storage_mb
FROM user_subscriptions
GROUP BY status;

-- =====================================================
-- This is the FASTEST way - single UPDATE query!
-- =====================================================
