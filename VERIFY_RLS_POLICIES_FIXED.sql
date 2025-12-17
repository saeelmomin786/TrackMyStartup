-- =====================================================
-- VERIFY RLS POLICIES ARE FIXED
-- =====================================================
-- Run this to check if RLS policies have the correct structure
-- =====================================================

-- Check user_profiles UPDATE policy
SELECT 
    'user_profiles UPDATE Policy' as check_type,
    policyname,
    cmd,
    CASE 
        WHEN with_check IS NOT NULL AND with_check != '' THEN '✅ Has WITH CHECK'
        ELSE '❌ Missing WITH CHECK'
    END as policy_status,
    qual as using_clause,
    with_check as with_check_clause
FROM pg_policies
WHERE tablename = 'user_profiles' 
  AND schemaname = 'public'
  AND cmd = 'UPDATE';

-- Check all UPDATE policies for missing WITH CHECK
SELECT 
    'All UPDATE Policies Status' as check_type,
    tablename,
    policyname,
    cmd,
    CASE 
        WHEN with_check IS NOT NULL AND with_check != '' THEN '✅ Has WITH CHECK'
        ELSE '❌ Missing WITH CHECK'
    END as policy_status
FROM pg_policies
WHERE schemaname = 'public'
  AND cmd = 'UPDATE'
  AND tablename IN (
      'user_profiles', 
      'startups', 
      'founders', 
      'startup_shares', 
      'subsidiaries', 
      'international_operations',
      'advisor_added_startups',
      'mentor_profiles',
      'investor_profiles',
      'investment_advisor_profiles'
  )
ORDER BY 
    CASE 
        WHEN with_check IS NOT NULL AND with_check != '' THEN 1
        ELSE 2
    END,
    tablename;

-- Summary
SELECT 
    'Summary' as info,
    COUNT(*) FILTER (WHERE with_check IS NOT NULL AND with_check != '') as policies_with_check,
    COUNT(*) FILTER (WHERE with_check IS NULL OR with_check = '') as policies_missing_check,
    COUNT(*) as total_update_policies
FROM pg_policies
WHERE schemaname = 'public'
  AND cmd = 'UPDATE'
  AND tablename IN (
      'user_profiles', 
      'startups', 
      'founders', 
      'startup_shares', 
      'subsidiaries', 
      'international_operations',
      'advisor_added_startups',
      'mentor_profiles',
      'investor_profiles',
      'investment_advisor_profiles'
  );






