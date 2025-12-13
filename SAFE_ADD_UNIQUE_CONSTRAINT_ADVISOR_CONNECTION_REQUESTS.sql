-- =====================================================
-- SAFE MIGRATION: ADD UNIQUE CONSTRAINT TO PREVENT DUPLICATE REQUESTS
-- =====================================================
-- This script safely adds unique constraints by:
-- 1. First checking for existing duplicates
-- 2. Cleaning up duplicates (keeping the most recent)
-- 3. Then creating the unique indexes
-- 
-- ✅ SAFE TO RUN: Uses IF NOT EXISTS, won't break existing functionality
-- ✅ IDEMPOTENT: Can be run multiple times safely

-- =====================================================
-- STEP 1: CHECK FOR EXISTING DUPLICATES
-- =====================================================

-- Check for duplicate pending requests
SELECT 
    'Duplicate Pending Requests' as check_type,
    advisor_id,
    requester_id,
    COUNT(*) as duplicate_count,
    array_agg(id ORDER BY created_at DESC) as request_ids,
    array_agg(created_at ORDER BY created_at DESC) as created_dates
FROM public.advisor_connection_requests
WHERE status = 'pending'
GROUP BY advisor_id, requester_id
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC;

-- Check for duplicate accepted requests
SELECT 
    'Duplicate Accepted Requests' as check_type,
    advisor_id,
    requester_id,
    COUNT(*) as duplicate_count,
    array_agg(id ORDER BY created_at DESC) as request_ids,
    array_agg(created_at ORDER BY created_at DESC) as created_dates
FROM public.advisor_connection_requests
WHERE status = 'accepted'
GROUP BY advisor_id, requester_id
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC;

-- =====================================================
-- STEP 2: CLEAN UP DUPLICATE PENDING REQUESTS
-- =====================================================
-- Keep only the most recent pending request for each (advisor_id, requester_id) pair
-- Delete older duplicates

DELETE FROM public.advisor_connection_requests
WHERE id IN (
    SELECT id
    FROM (
        SELECT 
            id,
            ROW_NUMBER() OVER (
                PARTITION BY advisor_id, requester_id 
                ORDER BY created_at DESC
            ) as rn
        FROM public.advisor_connection_requests
        WHERE status = 'pending'
    ) ranked
    WHERE rn > 1  -- Keep only the first (most recent), delete others
);

-- =====================================================
-- STEP 3: CLEAN UP DUPLICATE ACCEPTED REQUESTS
-- =====================================================
-- Keep only the most recent accepted request for each (advisor_id, requester_id) pair
-- Delete older duplicates

DELETE FROM public.advisor_connection_requests
WHERE id IN (
    SELECT id
    FROM (
        SELECT 
            id,
            ROW_NUMBER() OVER (
                PARTITION BY advisor_id, requester_id 
                ORDER BY created_at DESC
            ) as rn
        FROM public.advisor_connection_requests
        WHERE status = 'accepted'
    ) ranked
    WHERE rn > 1  -- Keep only the first (most recent), delete others
);

-- =====================================================
-- STEP 4: CREATE UNIQUE INDEXES (NOW SAFE - NO DUPLICATES)
-- =====================================================

-- Step 4.1: Create partial unique index to prevent duplicate pending requests
-- This prevents multiple pending requests between same advisor and requester
CREATE UNIQUE INDEX IF NOT EXISTS idx_advisor_connection_requests_unique_pending
ON public.advisor_connection_requests(advisor_id, requester_id)
WHERE status = 'pending';

-- Step 4.2: Create partial unique index to prevent new requests when already accepted
-- This prevents sending new request if one is already accepted
CREATE UNIQUE INDEX IF NOT EXISTS idx_advisor_connection_requests_unique_accepted
ON public.advisor_connection_requests(advisor_id, requester_id)
WHERE status = 'accepted';

-- =====================================================
-- STEP 5: VERIFY THE INDEXES WERE CREATED
-- =====================================================

SELECT 
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'advisor_connection_requests'
  AND (indexname = 'idx_advisor_connection_requests_unique_pending' 
       OR indexname = 'idx_advisor_connection_requests_unique_accepted')
ORDER BY indexname;

-- =====================================================
-- STEP 6: VERIFY NO DUPLICATES REMAIN
-- =====================================================

-- Final check - should return 0 rows if cleanup was successful
SELECT 
    'Final Duplicate Check - Pending' as check_type,
    advisor_id,
    requester_id,
    COUNT(*) as count
FROM public.advisor_connection_requests
WHERE status = 'pending'
GROUP BY advisor_id, requester_id
HAVING COUNT(*) > 1;

SELECT 
    'Final Duplicate Check - Accepted' as check_type,
    advisor_id,
    requester_id,
    COUNT(*) as count
FROM public.advisor_connection_requests
WHERE status = 'accepted'
GROUP BY advisor_id, requester_id
HAVING COUNT(*) > 1;

-- =====================================================
-- SUMMARY
-- =====================================================
-- ✅ This script is SAFE to run:
--   1. Uses IF NOT EXISTS - won't fail if indexes already exist
--   2. Cleans duplicates before creating indexes
--   3. Only affects duplicate records, not valid ones
--   4. Won't break existing functionality
--   5. Can be run multiple times (idempotent)
--
-- ⚠️ IMPORTANT: Review the duplicate check results (Step 1) before
--    running the cleanup (Steps 2-3) to see what will be deleted

