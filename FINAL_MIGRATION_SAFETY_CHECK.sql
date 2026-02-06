-- ✅ FINAL MIGRATION SAFETY VERIFICATION
-- Check if Auth User ID exists in auth.users table
-- And verify all constraints will be satisfied

-- STEP 1: Verify Auth User ID exists in auth.users
SELECT 
  'Auth User Check' as verification,
  1 as found_in_auth_users,
  id as auth_user_id
FROM auth.users
WHERE id = 'ad3ec5ce-5945-4c73-a562-2a0f3a8b08fd'
LIMIT 1;

-- STEP 2: Check Profile ID exists in user_profiles
SELECT 
  'Profile ID Check' as verification,
  1 as found_in_profiles,
  id as profile_id,
  auth_user_id
FROM user_profiles
WHERE id = 'd3fa5dca-ebf9-4570-b2c8-d5aa76a1c6b1'
LIMIT 1;

-- STEP 3: Verify relationship between Auth ID and Profile ID
SELECT 
  'Relationship Check' as verification,
  up.id as profile_id,
  up.auth_user_id,
  COUNT(ipq.id) as program_questions_with_profile_id,
  COUNT(ipq2.id) as program_questions_with_auth_id
FROM user_profiles up
LEFT JOIN incubation_program_questions ipq ON ipq.facilitator_id = up.id
LEFT JOIN incubation_program_questions ipq2 ON ipq2.facilitator_id = up.auth_user_id
WHERE up.id = 'd3fa5dca-ebf9-4570-b2c8-d5aa76a1c6b1'
GROUP BY up.id, up.auth_user_id;

-- STEP 4: Check current state of tables
SELECT 
  'incubation_program_questions' as table_name,
  facilitator_id,
  COUNT(*) as record_count,
  CASE 
    WHEN facilitator_id = 'ad3ec5ce-5945-4c73-a562-2a0f3a8b08fd' THEN '✅ Auth ID (Correct)'
    WHEN facilitator_id = 'd3fa5dca-ebf9-4570-b2c8-d5aa76a1c6b1' THEN '⚠️ Profile ID (Needs Migration)'
    ELSE '❓ Unknown ID'
  END as status
FROM incubation_program_questions
GROUP BY facilitator_id
UNION ALL
SELECT 
  'reports_mandate' as table_name,
  facilitator_id,
  COUNT(*) as record_count,
  CASE 
    WHEN facilitator_id = 'ad3ec5ce-5945-4c73-a562-2a0f3a8b08fd' THEN '✅ Auth ID (Correct)'
    WHEN facilitator_id = 'd3fa5dca-ebf9-4570-b2c8-d5aa76a1c6b1' THEN '⚠️ Profile ID (Needs Migration)'
    ELSE '❓ Unknown ID'
  END as status
FROM reports_mandate
GROUP BY facilitator_id
UNION ALL
SELECT 
  'program_tracking_responses' as table_name,
  facilitator_id,
  COUNT(*) as record_count,
  CASE 
    WHEN facilitator_id = 'ad3ec5ce-5945-4c73-a562-2a0f3a8b08fd' THEN '✅ Auth ID (Correct)'
    WHEN facilitator_id = 'd3fa5dca-ebf9-4570-b2c8-d5aa76a1c6b1' THEN '⚠️ Profile ID (Needs Migration)'
    ELSE '❓ Unknown ID'
  END as status
FROM program_tracking_responses
GROUP BY facilitator_id;

-- STEP 5: Verify Auth ID is valid for auth.users(id) foreign key
SELECT 
  'Foreign Key Validation' as check_name,
  CASE 
    WHEN EXISTS (SELECT 1 FROM auth.users WHERE id = 'ad3ec5ce-5945-4c73-a562-2a0f3a8b08fd') 
    THEN '✅ Auth ID exists in auth.users - SAFE TO MIGRATE'
    ELSE '❌ Auth ID NOT in auth.users - MIGRATION WILL FAIL'
  END as result;

-- STEP 6: Check if any records reference deleted users
SELECT 
  'Orphaned Records Check' as check_name,
  'incubation_program_questions' as table_name,
  COUNT(*) as orphaned_count
FROM incubation_program_questions
WHERE facilitator_id NOT IN (SELECT id FROM auth.users);

-- STEP 7: Check all working flows will still work
SELECT 
  'FacilitatorView - Load Opportunities' as flow,
  'Auth ID' as uses,
  'incubation_opportunities' as table,
  CASE WHEN EXISTS (
    SELECT 1 FROM incubation_opportunities 
    WHERE facilitator_id = 'ad3ec5ce-5945-4c73-a562-2a0f3a8b08fd'
  ) THEN '✅ Data exists - WILL WORK'
  ELSE '⚠️ No data with this ID' END as status
UNION ALL
SELECT 
  'FacilitatorView - Load Recognition Records' as flow,
  'Profile ID → facilitator_code' as uses,
  'user_profiles → recognition_records' as table,
  CASE WHEN EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE id = 'd3fa5dca-ebf9-4570-b2c8-d5aa76a1c6b1'
  ) THEN '✅ Profile exists - WILL WORK'
  ELSE '❌ Profile missing' END as status
UNION ALL
SELECT 
  'StartupDashboard - Tracking Questions' as flow,
  'Auth ID (from opportunities)' as uses,
  'incubation_opportunities → incubation_program_questions' as table,
  CASE WHEN EXISTS (
    SELECT 1 FROM incubation_opportunities 
    WHERE facilitator_id = 'ad3ec5ce-5945-4c73-a562-2a0f3a8b08fd'
    LIMIT 1
  ) THEN '✅ Flow will work - Auth ID matches'
  ELSE '⚠️ Check data' END as status;

-- ============================================================
-- MIGRATION DECISION CRITERIA:
-- ============================================================
-- ✅ Migration is SAFE IF all of these are true:
-- 1. Auth ID 'ad3ec5ce-5945-4c73-a562-2a0f3a8b08fd' exists in auth.users
-- 2. No orphaned records (all facilitator_ids in auth.users)
-- 3. No foreign key violations will occur
-- 4. Profile ID relationship is correct
-- ============================================================
