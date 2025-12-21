-- =====================================================
-- FIX: Foreign Key Constraint Issue for mentor_requests
-- =====================================================
-- Problem: requester_id must reference auth.users(id)
-- But sometimes the user might not exist in auth.users
-- 
-- Solution: Check if the constraint exists and verify the reference
-- =====================================================

-- Step 1: Check current foreign key constraints
SELECT 
    tc.constraint_name, 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_name = 'mentor_requests'
  AND kcu.column_name = 'requester_id';

-- Step 2: Verify the constraint is correct
-- The constraint should reference auth.users(id)
-- If it doesn't, we need to fix it

-- Step 3: If needed, drop and recreate the constraint
-- (Only run this if the constraint is wrong)
-- ALTER TABLE mentor_requests 
-- DROP CONSTRAINT IF EXISTS mentor_requests_requester_id_fkey;
-- 
-- ALTER TABLE mentor_requests 
-- ADD CONSTRAINT mentor_requests_requester_id_fkey 
-- FOREIGN KEY (requester_id) 
-- REFERENCES auth.users(id) 
-- ON DELETE CASCADE;

-- Step 4: Check for orphaned records (requester_id that don't exist in auth.users)
SELECT 
    mr.id,
    mr.requester_id,
    mr.mentor_id,
    mr.status,
    CASE 
        WHEN au.id IS NULL THEN 'MISSING IN auth.users'
        ELSE 'EXISTS'
    END as requester_status
FROM mentor_requests mr
LEFT JOIN auth.users au ON mr.requester_id = au.id
WHERE au.id IS NULL;

-- Step 5: Check if requester_id values are valid UUIDs
SELECT 
    id,
    requester_id,
    CASE 
        WHEN requester_id::text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' 
        THEN 'VALID UUID'
        ELSE 'INVALID UUID'
    END as uuid_status
FROM mentor_requests
WHERE requester_id::text !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';


