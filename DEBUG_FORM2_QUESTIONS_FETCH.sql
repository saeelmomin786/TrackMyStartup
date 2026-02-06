-- ============================================================
-- DEBUG: Why Form 2 Questions Not Loading
-- User: acec7880-0c9f-4757-b521-1bffd39dce25
-- Startup: 347
-- Application: 1edcb779-378c-485a-8d01-9a0564f2b00f
-- ============================================================

-- STEP 1: Verify the user can see their application
SELECT 
    '=== STEP 1: USER ACCESS TO APPLICATION ===' as step,
    oa.id as application_id,
    oa.startup_id,
    oa.opportunity_id,
    oa.form2_requested,
    s.user_id as startup_user_id,
    CASE 
        WHEN s.user_id = 'acec7880-0c9f-4757-b521-1bffd39dce25' THEN '✅ User owns this startup'
        ELSE '❌ User does NOT own this startup'
    END as access_check
FROM opportunity_applications oa
JOIN startups s ON oa.startup_id = s.id
WHERE oa.id = '1edcb779-378c-485a-8d01-9a0564f2b00f';

-- STEP 2: Check if Form 2 questions exist for this opportunity
SELECT 
    '=== STEP 2: FORM2 QUESTIONS EXIST? ===' as step,
    opportunity_id,
    COUNT(*) as question_count,
    json_agg(json_build_object(
        'id', id,
        'question_id', question_id,
        'is_required', is_required
    )) as questions
FROM incubation_opportunity_form2_questions
WHERE opportunity_id = '60437153-aa15-4c74-88b5-135d6d7afcfd'
GROUP BY opportunity_id;

-- STEP 3: Simulate the dashboard query to fetch questions
-- This is what your frontend SHOULD be running
SELECT 
    '=== STEP 3: DASHBOARD QUERY (What should run) ===' as step,
    f2q.id as form2_question_id,
    f2q.question_id,
    f2q.is_required,
    f2q.opportunity_id,
    aqb.question as question_text,
    aqb.question_category
FROM incubation_opportunity_form2_questions f2q
LEFT JOIN application_question_bank aqb ON aqb.id = f2q.question_id
WHERE f2q.opportunity_id = '60437153-aa15-4c74-88b5-135d6d7afcfd'
ORDER BY f2q.id;

-- STEP 4: Check RLS on form2 questions table
SELECT 
    '=== STEP 4: RLS POLICIES ON FORM2 TABLE ===' as step,
    tablename,
    policyname,
    cmd,
    permissive,
    definition
FROM pg_policies
WHERE tablename = 'incubation_opportunity_form2_questions'
ORDER BY policyname;

-- STEP 5: Check if there's a lookup issue with question_bank
SELECT 
    '=== STEP 5: QUESTION BANK LOOKUP ===' as step,
    f2q.question_id,
    CASE 
        WHEN aqb.id IS NOT NULL THEN '✅ Question exists in bank'
        ELSE '❌ Question NOT in bank (might cause null)'
    END as lookup_status,
    aqb.question,
    aqb.question_category
FROM incubation_opportunity_form2_questions f2q
LEFT JOIN application_question_bank aqb ON aqb.id = f2q.question_id
WHERE f2q.opportunity_id = '60437153-aa15-4c74-88b5-135d6d7afcfd';

-- ============================================================
-- LIKELY ISSUE:
-- 1. RLS might be blocking access to form2_questions table
-- 2. Frontend query might not be joining correctly
-- 3. Question IDs might not exist in application_question_bank
-- ============================================================
