-- =====================================================
-- BACKFILL STORAGE TRACKING FOR EXISTING FILES
-- =====================================================
-- This SQL script helps identify existing files that need tracking
-- Run the API endpoint to actually backfill the data
-- =====================================================

-- =====================================================
-- STEP 1: Check Existing Files in Storage (Manual)
-- =====================================================
-- Note: This requires using Supabase Storage API or the backfill API endpoint
-- The API endpoint will scan buckets and create user_storage_usage records

-- =====================================================
-- STEP 2: Verify Current Storage Tracking Status
-- =====================================================

-- Check how many files are currently tracked
SELECT 
    'Current Tracking Status' as info,
    COUNT(*) as tracked_files,
    COUNT(DISTINCT user_id) as users_with_tracked_files,
    ROUND(SUM(file_size_mb), 2) as total_tracked_storage_mb
FROM user_storage_usage;

-- Check users with subscriptions and their storage
SELECT 
    us.user_id,
    us.plan_tier,
    us.storage_used_mb as subscription_storage_mb,
    COALESCE(SUM(usu.file_size_mb), 0) as tracked_storage_mb,
    (us.storage_used_mb - COALESCE(SUM(usu.file_size_mb), 0)) as difference_mb
FROM user_subscriptions us
LEFT JOIN user_storage_usage usu ON us.user_id = usu.user_id
WHERE us.status = 'active'
GROUP BY us.user_id, us.plan_tier, us.storage_used_mb
ORDER BY ABS(us.storage_used_mb - COALESCE(SUM(usu.file_size_mb), 0)) DESC;

-- =====================================================
-- STEP 3: Find Users Who Might Have Untracked Files
-- =====================================================

-- Users with startups but no tracked files
SELECT 
    s.user_id,
    COUNT(*) as startup_count,
    (SELECT COUNT(*) FROM user_storage_usage WHERE user_id = s.user_id) as tracked_files
FROM startups s
WHERE NOT EXISTS (
    SELECT 1 FROM user_storage_usage WHERE user_id = s.user_id
)
GROUP BY s.user_id
ORDER BY startup_count DESC;

-- =====================================================
-- STEP 4: After Backfill - Verify Results
-- =====================================================

-- After running the backfill API, verify the results
SELECT 
    'After Backfill' as info,
    COUNT(*) as total_tracked_files,
    COUNT(DISTINCT user_id) as users_with_files,
    ROUND(SUM(file_size_mb), 2) as total_storage_mb,
    ROUND(AVG(file_size_mb), 2) as avg_file_size_mb
FROM user_storage_usage;

-- Check storage by bucket
SELECT 
    CASE 
        WHEN storage_location LIKE 'compliance-documents%' THEN 'compliance-documents'
        WHEN storage_location LIKE 'financial-attachments%' THEN 'financial-attachments'
        WHEN storage_location LIKE 'financial-documents%' THEN 'financial-documents'
        WHEN storage_location LIKE 'employee-contracts%' THEN 'employee-contracts'
        WHEN storage_location LIKE 'pitch-decks%' THEN 'pitch-decks'
        WHEN storage_location LIKE 'company-documents%' THEN 'company-documents'
        WHEN storage_location LIKE 'startup-documents%' THEN 'startup-documents'
        WHEN storage_location LIKE 'verification-documents%' THEN 'verification-documents'
        ELSE 'other'
    END as bucket,
    COUNT(*) as file_count,
    ROUND(SUM(file_size_mb), 2) as total_mb
FROM user_storage_usage
GROUP BY bucket
ORDER BY total_mb DESC;

-- =====================================================
-- NOTES:
-- =====================================================
-- 1. Run the API endpoint to backfill: POST /api/storage/backfill?userId=xxx
-- 2. Or backfill all users: POST /api/storage/backfill?allUsers=true
-- 3. The API will scan Supabase Storage buckets and create tracking records
-- 4. Only files that belong to the user (by path matching) will be tracked
-- 5. Files already tracked will be skipped
-- =====================================================
