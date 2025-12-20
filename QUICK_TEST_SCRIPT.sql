-- =====================================================
-- QUICK TEST SCRIPT - Mentor-Startup Connection Flow
-- =====================================================
-- Use this to quickly set up test data for testing

-- Step 1: Get Test Users
-- =====================================================
-- Get a mentor user
SELECT 
  id as mentor_user_id,
  email as mentor_email,
  role
FROM auth.users 
WHERE role = 'Mentor' 
LIMIT 1;

-- Get a startup user
SELECT 
  id as startup_user_id,
  email as startup_email,
  role
FROM auth.users 
WHERE role = 'Startup' 
LIMIT 1;

-- Get startup ID
SELECT 
  id as startup_id,
  name as startup_name,
  user_id
FROM public.startups 
WHERE user_id = 'PASTE_STARTUP_USER_ID_HERE'
LIMIT 1;

-- =====================================================
-- Step 2: Create Test Request
-- =====================================================
-- Replace the IDs with actual values from Step 1
INSERT INTO mentor_requests (
  mentor_id,
  requester_id,
  requester_type,
  startup_id,
  status,
  message,
  proposed_fee_amount,
  proposed_equity_amount,
  proposed_esop_percentage
) VALUES (
  'PASTE_MENTOR_USER_ID_HERE',  -- From Step 1
  'PASTE_STARTUP_USER_ID_HERE', -- From Step 1
  'Startup',
  PASTE_STARTUP_ID_HERE,        -- From Step 1 (integer, no quotes)
  'pending',
  'This is a test connection request for testing the mentor-startup flow.',
  1000.00,
  5000.00,
  2.5
) RETURNING id, status, requested_at;

-- =====================================================
-- Step 3: Create Test Assignment (for scheduling test)
-- =====================================================
-- First, accept a request or create assignment directly
INSERT INTO mentor_startup_assignments (
  mentor_id,
  startup_id,
  status,
  assigned_at,
  fee_amount,
  fee_currency,
  esop_percentage
) VALUES (
  'PASTE_MENTOR_USER_ID_HERE',
  PASTE_STARTUP_ID_HERE,
  'active',
  NOW(),
  1000.00,
  'USD',
  2.5
) RETURNING id, status, assigned_at;

-- =====================================================
-- Step 4: Create Test Availability Slot
-- =====================================================
-- Create a recurring slot (Monday, 10 AM - 11 AM)
INSERT INTO mentor_availability_slots (
  mentor_id,
  day_of_week,
  start_time,
  end_time,
  is_recurring,
  is_active,
  valid_from
) VALUES (
  'PASTE_MENTOR_USER_ID_HERE',
  1,  -- Monday (0=Sunday, 1=Monday, etc.)
  '10:00:00',
  '11:00:00',
  true,
  true,
  CURRENT_DATE
) RETURNING id, day_of_week, start_time, end_time;

-- =====================================================
-- Step 5: Create Test Session
-- =====================================================
INSERT INTO mentor_startup_sessions (
  mentor_id,
  startup_id,
  assignment_id,
  session_date,
  session_time,
  duration_minutes,
  status,
  google_meet_link
) VALUES (
  'PASTE_MENTOR_USER_ID_HERE',
  PASTE_STARTUP_ID_HERE,
  PASTE_ASSIGNMENT_ID_HERE,  -- From Step 3
  CURRENT_DATE + INTERVAL '7 days',  -- 7 days from now
  '10:00:00',
  60,
  'scheduled',
  'https://meet.google.com/test-xxxx-xxxx'  -- Test link
) RETURNING id, session_date, session_time, google_meet_link;

-- =====================================================
-- Step 6: View Test Data
-- =====================================================
-- View all requests
SELECT 
  id,
  mentor_id,
  startup_id,
  status,
  proposed_fee_amount,
  proposed_equity_amount,
  negotiated_fee_amount,
  negotiated_equity_amount,
  requested_at
FROM mentor_requests
WHERE requester_id = 'PASTE_STARTUP_USER_ID_HERE'
ORDER BY requested_at DESC;

-- View all assignments
SELECT 
  id,
  mentor_id,
  startup_id,
  status,
  assigned_at,
  fee_amount,
  esop_percentage
FROM mentor_startup_assignments
WHERE mentor_id = 'PASTE_MENTOR_USER_ID_HERE'
ORDER BY assigned_at DESC;

-- View all sessions
SELECT 
  id,
  mentor_id,
  startup_id,
  session_date,
  session_time,
  duration_minutes,
  status,
  google_meet_link
FROM mentor_startup_sessions
WHERE mentor_id = 'PASTE_MENTOR_USER_ID_HERE'
ORDER BY session_date DESC, session_time DESC;

-- =====================================================
-- Step 7: Cleanup Test Data (Optional)
-- =====================================================
-- Delete test requests
-- DELETE FROM mentor_requests WHERE message LIKE '%test%';

-- Delete test sessions
-- DELETE FROM mentor_startup_sessions WHERE google_meet_link LIKE '%test%';

-- Delete test assignments
-- DELETE FROM mentor_startup_assignments WHERE fee_amount = 1000.00;

-- =====================================================
-- NOTES:
-- =====================================================
-- 1. Replace all 'PASTE_..._HERE' with actual values from Step 1
-- 2. Run Step 1 first to get the IDs
-- 3. Use the IDs in subsequent steps
-- 4. Test each phase one at a time
-- 5. Clean up test data when done (optional)

