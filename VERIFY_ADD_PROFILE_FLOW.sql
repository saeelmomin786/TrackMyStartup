-- =====================================================
-- VERIFY ADD PROFILE FLOW IS READY
-- =====================================================
-- This script verifies that all components are in place
-- for the "Add Profile" flow to work correctly
-- =====================================================

-- =====================================================
-- STEP 1: CHECK TRIGGER FUNCTIONS ARE FIXED
-- =====================================================

SELECT '=== STEP 1: CHECKING TRIGGER FUNCTIONS ===' as info;

SELECT 
    proname as function_name,
    prosecdef as is_security_definer,
    CASE 
        WHEN prosecdef THEN '✅ SECURITY DEFINER (bypasses RLS)'
        ELSE '❌ NOT SECURITY DEFINER (may fail)'
    END as security_status
FROM pg_proc
WHERE proname IN (
    'initialize_startup_shares',
    'initialize_startup_shares_with_esop',
    'initialize_startup_shares_for_new_startup'
)
ORDER BY proname;

-- =====================================================
-- STEP 2: CHECK TRIGGERS ARE ACTIVE
-- =====================================================

SELECT '=== STEP 2: CHECKING TRIGGERS ===' as info;

SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_timing,
    action_statement
FROM information_schema.triggers
WHERE trigger_name LIKE '%initialize_startup_shares%'
ORDER BY trigger_name;

-- =====================================================
-- STEP 3: CHECK RLS POLICIES FOR STARTUPS TABLE
-- =====================================================

SELECT '=== STEP 3: CHECKING STARTUPS INSERT POLICY ===' as info;

SELECT 
    policyname,
    cmd,
    permissive,
    roles,
    with_check
FROM pg_policies 
WHERE tablename = 'startups'
    AND cmd = 'INSERT'
ORDER BY policyname;

-- =====================================================
-- STEP 4: CHECK RLS POLICIES FOR STARTUP_SHARES TABLE
-- =====================================================

SELECT '=== STEP 4: CHECKING STARTUP_SHARES INSERT POLICY ===' as info;

SELECT 
    policyname,
    cmd,
    permissive,
    roles,
    with_check
FROM pg_policies 
WHERE tablename = 'startup_shares'
    AND cmd = 'INSERT'
ORDER BY policyname;

-- =====================================================
-- STEP 5: CHECK TABLE PERMISSIONS
-- =====================================================

SELECT '=== STEP 5: CHECKING TABLE PERMISSIONS ===' as info;

SELECT 
    grantee,
    table_name,
    privilege_type
FROM information_schema.role_table_grants
WHERE table_name IN ('startups', 'startup_shares')
    AND privilege_type = 'INSERT'
ORDER BY table_name, grantee;

-- =====================================================
-- STEP 6: SUMMARY - WHAT SHOULD WORK
-- =====================================================

SELECT '=== SUMMARY: ADD PROFILE FLOW READINESS ===' as info;

SELECT 
    CASE 
        WHEN (SELECT COUNT(*) FROM pg_proc WHERE proname IN ('initialize_startup_shares', 'initialize_startup_shares_with_esop', 'initialize_startup_shares_for_new_startup') AND prosecdef = true) = 3
            THEN '✅ All trigger functions use SECURITY DEFINER'
        ELSE '⚠️ Some trigger functions may not bypass RLS'
    END as trigger_functions_status,
    
    CASE 
        WHEN (SELECT COUNT(*) FROM information_schema.triggers WHERE trigger_name LIKE '%initialize_startup_shares%') > 0
            THEN '✅ Triggers are active'
        ELSE '❌ No triggers found'
    END as triggers_status,
    
    CASE 
        WHEN (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'startups' AND cmd = 'INSERT') > 0
            THEN '✅ INSERT policy exists for startups'
        ELSE '❌ No INSERT policy for startups'
    END as startups_insert_policy,
    
    CASE 
        WHEN (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'startup_shares' AND cmd = 'INSERT') > 0
            THEN '✅ INSERT policy exists for startup_shares'
        ELSE '⚠️ No INSERT policy for startup_shares (may rely on SECURITY DEFINER)'
    END as startup_shares_insert_policy;

-- =====================================================
-- STEP 7: TEST SCENARIO CHECKLIST
-- =====================================================

SELECT '=== ADD PROFILE FLOW CHECKLIST ===' as info;

SELECT 
    '1. User clicks "Add Profile" button' as step1,
    '2. Form 1 (BasicRegistrationStep) creates profile with skipSwitch: true' as step2,
    '3. Form 2 (CompleteRegistrationPage) receives newProfileId' as step3,
    '4. Form 2 creates startup using auth_user_id (not profile_id)' as step4,
    '5. Trigger fires and creates startup_shares (checks for duplicates)' as step5,
    '6. Profile switches to new profile after Form 2 completion' as step6,
    '7. Dashboard shows new startup profile' as step7;


