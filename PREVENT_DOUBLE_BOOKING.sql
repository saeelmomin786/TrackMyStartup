-- =====================================================
-- PREVENT DOUBLE-BOOKING: Add Unique Constraint
-- =====================================================
-- This script adds a unique constraint to prevent multiple startups
-- from booking the same time slot for the same mentor.
--
-- Problem: If two startups try to book the same slot simultaneously,
-- both might succeed, causing double-booking and multiple calendar events.
--
-- Solution: Add unique constraint at database level to prevent this.
-- =====================================================

-- Check current constraints
SELECT '=== CURRENT CONSTRAINTS ===' as info;

SELECT 
    conname as constraint_name,
    contype as constraint_type,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'mentor_startup_sessions'::regclass
ORDER BY conname;

-- Add unique constraint to prevent double-booking
-- IMPORTANT: This only prevents the SAME mentor from having multiple bookings at the same time
-- Different mentors CAN have meetings at the same time (this is allowed and expected)
-- Only one 'scheduled' session per mentor/date/time combination
DO $$ 
BEGIN
  -- Check if constraint already exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'mentor_startup_sessions'
    AND indexname = 'unique_mentor_time_slot'
  ) THEN
    -- Create unique partial index (only for scheduled sessions)
    -- This prevents double-booking for the SAME mentor while allowing:
    -- - Different mentors to have meetings at the same time ✅
    -- - Multiple completed/cancelled sessions for history ✅
    CREATE UNIQUE INDEX unique_mentor_time_slot 
    ON mentor_startup_sessions(mentor_id, session_date, session_time)
    WHERE status = 'scheduled';
    
    RAISE NOTICE '✅ Constraint unique_mentor_time_slot created successfully';
    RAISE NOTICE 'ℹ️ This prevents same mentor double-booking, but allows different mentors at same time';
  ELSE
    RAISE NOTICE 'ℹ️ Constraint unique_mentor_time_slot already exists';
  END IF;
END $$;

-- Verify the constraint was created
SELECT '=== VERIFICATION ===' as info;

SELECT 
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'mentor_startup_sessions'
AND indexname = 'unique_mentor_time_slot';

-- Test query to show how it works
SELECT '=== HOW IT WORKS ===' as info;

-- This constraint ensures:
-- ✅ Only one scheduled session per mentor/date/time
-- ✅ Multiple completed/cancelled sessions allowed (for history)
-- ✅ Database automatically rejects second booking
-- ✅ Prevents race conditions

