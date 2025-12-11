-- =====================================================
-- QUICK STRUCTURE CHECK
-- =====================================================
-- Run this to quickly verify the table structure is correct

-- Check critical columns (advisor_id and startup_user_id should be UUID)
SELECT 
    column_name,
    data_type,
    CASE 
        WHEN column_name IN ('advisor_id', 'startup_user_id') AND data_type = 'uuid' 
        THEN '✅ CORRECT'
        WHEN column_name IN ('advisor_id', 'startup_user_id') AND data_type = 'character varying'
        THEN '❌ WRONG - Needs to be UUID'
        ELSE 'OK'
    END as status_check
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'advisor_startup_link_requests'
AND column_name IN ('advisor_id', 'startup_user_id', 'id', 'startup_id', 'status');

-- Check all columns for reference
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'advisor_startup_link_requests'
ORDER BY ordinal_position;

-- Check RLS policies
SELECT 
    policyname,
    cmd as command
FROM pg_policies 
WHERE tablename = 'advisor_startup_link_requests'
ORDER BY policyname;


