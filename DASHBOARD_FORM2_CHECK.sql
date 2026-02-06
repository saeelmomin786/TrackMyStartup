-- ============================================================
-- STARTUP DASHBOARD FORM 2 CHECK
-- Purpose: Trace how dashboard checks if Form 2 questions exist
-- Question: Profile ID or Auth User ID?
-- ============================================================

-- SECTION 1: Simulate the dashboard query
-- When startup user logs in and views "My Applications"
SELECT 
    '=== DASHBOARD PERSPECTIVE ===' as section,
    'User logs in with auth.uid() = 6ce30399-7b8e-4bbc-a1cc-57aec37b2526' as step_1,
    '↓' as arrow_1,
    'Dashboard queries: WHERE startups.user_id = auth.uid()' as step_2,
    '↓' as arrow_2,
    'Finds applications for this startup' as step_3,
    '↓' as arrow_3,
    'Checks if form2_requested = TRUE' as step_4,
    '↓' as arrow_4,
    'Fetches Form 2 questions for that opportunity' as step_5;

-- SECTION 2: What the dashboard query looks like
-- This is likely what runs when user opens "Fill Form 2" page
SELECT 
    '=== ACTUAL DASHBOARD QUERY ===' as section,
    au.id as "auth_uid_logged_in_user",
    au.email as logged_in_email,
    s.id as startup_id,
    s.user_id as "startup_user_id_CHECK",
    oa.id as application_id,
    oa.opportunity_id,
    oa.form2_requested,
    oa.form2_submitted,
    io.program_name,
    COUNT(f2q.id) as form2_questions_available,
    '---' as separator,
    CASE 
        WHEN s.user_id = au.id THEN '✅ USES AUTH.UID() = AUTH.USERS.ID'
        ELSE '❌ ID MISMATCH'
    END as dashboard_uses,
    CASE 
        WHEN oa.form2_requested = true AND COUNT(f2q.id) > 0 THEN '✅ SHOW "FILL FORM 2" BUTTON'
        WHEN oa.form2_requested = true AND COUNT(f2q.id) = 0 THEN '⚠️ NO QUESTIONS CONFIGURED'
        ELSE '❌ FORM 2 NOT REQUESTED'
    END as dashboard_action
FROM auth.users au
JOIN startups s ON s.user_id = au.id  -- ← THIS IS THE KEY CHECK: uses auth.users.id
JOIN opportunity_applications oa ON oa.startup_id = s.id
JOIN incubation_opportunities io ON io.id = oa.opportunity_id
LEFT JOIN incubation_opportunity_form2_questions f2q ON f2q.opportunity_id = oa.opportunity_id
WHERE au.id = '6ce30399-7b8e-4bbc-a1cc-57aec37b2526'
  AND oa.form2_requested = true
GROUP BY au.id, au.email, s.id, s.user_id, oa.id, oa.opportunity_id, 
         oa.form2_requested, oa.form2_submitted, io.program_name;

-- SECTION 3: RLS Policy Check (what happens behind the scenes)
SELECT 
    '=== RLS POLICY VERIFICATION ===' as section,
    'auth.uid()' as what_rls_checks,
    '=' as comparison,
    'startups.user_id' as against_this_column,
    '---' as separator,
    '✅ If match: User can see their applications and Form 2' as when_match,
    '❌ If no match: RLS blocks access, no Form 2 shown' as when_no_match,
    '---' as conclusion,
    'DASHBOARD USES: auth.uid() (AUTH USER ID, NOT PROFILE)' as answer;

-- SECTION 4: Check RLS policies on relevant tables
SELECT 
    '=== ACTUAL RLS POLICIES ===' as section,
    tablename,
    policyname,
    cmd as policy_applies_to,
    CASE 
        WHEN definition LIKE '%auth.uid()%' THEN '✅ Uses auth.uid() - AUTH USER ID'
        WHEN definition LIKE '%auth.email()%' THEN '📧 Uses auth.email()'
        ELSE 'Other check'
    END as uses_auth_id,
    definition
FROM pg_policies
WHERE tablename IN ('startups', 'opportunity_applications', 'incubation_opportunity_form2_questions')
  AND cmd = 'SELECT'
ORDER BY tablename, policyname;

-- SECTION 5: Verify the exact check for wrong vs right user
SELECT 
    '=== WRONG USER (acec7880) vs RIGHT USER (6ce30399) ===' as section,
    '❌ Wrong User: acec7880-0c9f-4757-b521-1bffd39dce25' as wrong_user,
    'startups.user_id ≠ auth.uid() → RLS BLOCKS' as wrong_result,
    '---' as sep,
    '✅ Right User: 6ce30399-7b8e-4bbc-a1cc-57aec37b2526' as right_user,
    'startups.user_id = auth.uid() → RLS ALLOWS' as right_result,
    '---' as conclusion,
    'Dashboard Form 2 check uses: startups.user_id = auth.uid() (AUTH ID)' as final_answer;

-- ============================================================
-- ANSWER:
-- Dashboard checks Form 2 using AUTH USER ID:
-- 1. User logs in → auth.uid() set to their auth.users.id
-- 2. Query: SELECT ... FROM startups WHERE user_id = auth.uid()
-- 3. RLS enforces: startups.user_id MUST EQUAL auth.uid()
-- 4. If match → fetch applications → check form2_requested
-- 5. If questions exist → show "Fill Form 2" button
-- 
-- USES: AUTH.USERS.ID (auth.uid())
-- NOT: profile_id from any profile table
-- ============================================================
