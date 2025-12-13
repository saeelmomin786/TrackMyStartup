-- =====================================================
-- ADD UNIQUE CONSTRAINT TO PREVENT DUPLICATE REQUESTS
-- =====================================================
-- This script adds unique constraints to prevent:
-- 1. Duplicate pending requests (same advisor + requester)
-- 2. New requests when already accepted (same advisor + requester)

-- Step 1: Create partial unique index to prevent duplicate pending requests
-- This prevents multiple pending requests between same advisor and requester
CREATE UNIQUE INDEX IF NOT EXISTS idx_advisor_connection_requests_unique_pending
ON public.advisor_connection_requests(advisor_id, requester_id)
WHERE status = 'pending';

-- Step 2: Create partial unique index to prevent new requests when already accepted
-- This prevents sending new request if one is already accepted
CREATE UNIQUE INDEX IF NOT EXISTS idx_advisor_connection_requests_unique_accepted
ON public.advisor_connection_requests(advisor_id, requester_id)
WHERE status = 'accepted';

-- Step 3: Verify the indexes were created
SELECT 
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'advisor_connection_requests'
  AND (indexname = 'idx_advisor_connection_requests_unique_pending' 
       OR indexname = 'idx_advisor_connection_requests_unique_accepted')
ORDER BY indexname;

-- =====================================================
-- HOW IT WORKS:
-- =====================================================
-- 
-- Scenario 1: First Request
--   User X → Sends request to User Y
--   ✅ Creates: { advisor_id: "Y", requester_id: "X", status: "pending" }
--
-- Scenario 2: Duplicate Pending Request
--   User X → Tries to send another request (first still pending)
--   ❌ BLOCKED: Unique constraint violation on pending index
--   → Code updates existing pending request instead
--
-- Scenario 3: Request Accepted
--   User Y → Accepts request
--   ✅ Updates: { status: "accepted" }
--
-- Scenario 4: Try to Send New Request After Acceptance
--   User X → Tries to send another request (previous was accepted)
--   ❌ BLOCKED: Unique constraint violation on accepted index
--   → Error: "Already connected" or similar message
--
-- Scenario 5: Request Rejected
--   User Y → Rejects request
--   ✅ Updates: { status: "rejected" }
--   User X → Can send new request (rejected doesn't block)
--   ✅ ALLOWED: No constraint on rejected status

