-- =====================================================
-- DEBUG ADVISOR CONNECTION REQUEST INSERT
-- =====================================================
-- Run this to check if you can insert a test request
-- Replace the UUIDs with your actual user IDs

-- 1. Check your current authenticated user
SELECT 
    auth.uid() as current_user_id,
    auth.email() as current_user_email;

-- 2. Check if the table allows your user to insert
-- Replace 'YOUR_USER_ID' and 'ADVISOR_USER_ID' with actual UUIDs
-- This simulates what the INSERT policy should allow
SELECT 
    CASE 
        WHEN auth.uid() = 'YOUR_USER_ID'::uuid THEN '✅ You can insert (auth.uid matches requester_id)'
        ELSE '❌ auth.uid() does not match requester_id'
    END as insert_permission_check;

-- 3. Check CHECK constraint values
-- This shows what requester_type values are allowed
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'public.advisor_connection_requests'::regclass
    AND contype = 'c'
    AND conname LIKE '%requester_type%';

-- 4. Test insert (uncomment and replace UUIDs to test)
-- This will only work if you're authenticated and policies are correct
/*
INSERT INTO public.advisor_connection_requests (
    advisor_id,
    requester_id,
    requester_type,
    collaborator_profile_url,
    status
) VALUES (
    'ADVISOR_USER_ID'::uuid,  -- Replace with advisor's user_id
    auth.uid(),                -- Your user_id (must match auth.uid())
    'Investor',                -- Your role
    'https://example.com',
    'pending'
) RETURNING *;
*/

-- 5. Check existing requests (if any)
SELECT 
    id,
    advisor_id,
    requester_id,
    requester_type,
    status,
    created_at
FROM public.advisor_connection_requests
ORDER BY created_at DESC
LIMIT 10;









