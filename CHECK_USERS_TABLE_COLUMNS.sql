-- =====================================================
-- CHECK IF users TABLE HAS ADVISOR ACCEPTANCE COLUMNS
-- =====================================================
-- This will show what columns exist in the users table
-- =====================================================

-- Check if advisor acceptance columns exist in users table
SELECT 
    'users table columns' as table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public'
  AND table_name = 'users' 
  AND column_name IN (
    'advisor_accepted', 
    'advisor_accepted_date', 
    'minimum_investment', 
    'maximum_investment', 
    'investment_stage', 
    'success_fee', 
    'success_fee_type', 
    'scouting_fee'
  )
ORDER BY column_name;

-- Check if advisor acceptance columns exist in user_profiles table
SELECT 
    'user_profiles table columns' as table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public'
  AND table_name = 'user_profiles' 
  AND column_name IN (
    'advisor_accepted', 
    'advisor_accepted_date', 
    'minimum_investment', 
    'maximum_investment', 
    'investment_stage', 
    'success_fee', 
    'success_fee_type', 
    'scouting_fee'
  )
ORDER BY column_name;

-- Summary: Compare what exists in both tables
SELECT 
    'Summary' as check_type,
    'users table' as table_name,
    COUNT(*) as columns_found
FROM information_schema.columns 
WHERE table_schema = 'public'
  AND table_name = 'users' 
  AND column_name IN (
    'advisor_accepted', 
    'advisor_accepted_date', 
    'minimum_investment', 
    'maximum_investment', 
    'investment_stage', 
    'success_fee', 
    'success_fee_type', 
    'scouting_fee'
  )
UNION ALL
SELECT 
    'Summary',
    'user_profiles table',
    COUNT(*)
FROM information_schema.columns 
WHERE table_schema = 'public'
  AND table_name = 'user_profiles' 
  AND column_name IN (
    'advisor_accepted', 
    'advisor_accepted_date', 
    'minimum_investment', 
    'maximum_investment', 
    'investment_stage', 
    'success_fee', 
    'success_fee_type', 
    'scouting_fee'
  );
