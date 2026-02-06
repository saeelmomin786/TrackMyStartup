-- ============================================================
-- TRACE FORM 2 ID STORAGE
-- Purpose: Determine what IDs are stored in Form 2 system
-- Question: Does Form 2 use auth user_id or profile_id?
-- ============================================================

-- SECTION 1: Check Form 2 questions table structure
SELECT 
    '=== FORM2 QUESTIONS TABLE ===' as section,
    f2q.id as form2_question_id,
    f2q.opportunity_id,
    f2q.question_id,
    f2q.is_required,
    io.facilitator_id as "opportunity_facilitator_id",
    CASE 
        WHEN io.facilitator_id IS NOT NULL THEN 'Linked to opportunity (uses facilitator auth_user_id)'
        ELSE 'No facilitator link'
    END as facilitator_id_type
FROM incubation_opportunity_form2_questions f2q
LEFT JOIN incubation_opportunities io ON f2q.opportunity_id = io.id
WHERE f2q.opportunity_id = '60437153-aa15-4c74-88b5-135d6d7afcfd'
LIMIT 5;

-- SECTION 2: Check if Form 2 responses table exists and what it stores
SELECT 
    '=== CHECKING FORM2 RESPONSES TABLES ===' as section,
    table_name,
    column_name,
    data_type,
    CASE 
        WHEN column_name LIKE '%user_id%' THEN '✅ Uses user_id (likely auth.users.id)'
        WHEN column_name LIKE '%profile%' THEN '⚠️ Uses profile_id'
        WHEN column_name LIKE '%startup%' THEN '🔗 Links to startup'
        WHEN column_name LIKE '%application%' THEN '🔗 Links to application'
        ELSE 'Other column'
    END as column_purpose
FROM information_schema.columns
WHERE table_schema = 'public'
  AND (table_name LIKE '%form2%' OR table_name LIKE '%form_2%')
  AND (column_name LIKE '%user%' OR column_name LIKE '%profile%' 
       OR column_name LIKE '%startup%' OR column_name LIKE '%application%')
ORDER BY table_name, column_name;

-- SECTION 3: Check the application table for Form 2 tracking
SELECT 
    '=== APPLICATION FORM2 TRACKING ===' as section,
    oa.id as application_id,
    oa.startup_id,
    oa.form2_requested,
    oa.form2_submitted,
    s.id as startup_pk,
    s.user_id as "startup_stores_this_user_id",
    au.id as auth_user_id,
    au.email,
    CASE 
        WHEN s.user_id = au.id THEN '✅ FORM2 LINKED VIA AUTH.USERS.ID'
        ELSE '❌ Different ID type'
    END as form2_id_chain
FROM opportunity_applications oa
JOIN startups s ON oa.startup_id = s.id
JOIN auth.users au ON s.user_id = au.id
WHERE oa.id = '1edcb779-378c-485a-8d01-9a0564f2b00f';

-- SECTION 4: Check RLS policies on Form 2 tables
SELECT 
    '=== FORM2 TABLE RLS POLICIES ===' as section,
    schemaname,
    tablename,
    policyname,
    CASE 
        WHEN definition LIKE '%auth.uid()%' THEN '✅ Uses auth.uid() - AUTH USER ID'
        WHEN definition LIKE '%user_id%' THEN '🔍 Uses user_id column'
        WHEN definition LIKE '%profile%' THEN '⚠️ Uses profile'
        ELSE 'Other policy'
    END as policy_type,
    definition
FROM pg_policies
WHERE tablename LIKE '%form2%' OR tablename LIKE '%form_2%'
ORDER BY tablename, policyname;

-- SECTION 5: Full Form 2 data flow for the specific application
SELECT 
    '=== COMPLETE FORM2 DATA FLOW ===' as section,
    'APPLICATION' as level_1,
    oa.id as application_id,
    oa.startup_id as "↓ links to startup.id",
    '---' as sep1,
    'STARTUP' as level_2,
    s.user_id as "startup.user_id (FK to auth.users)",
    '---' as sep2,
    'AUTH USER' as level_3,
    au.id as "auth.users.id (PK)",
    au.email,
    '---' as sep3,
    'FORM2 CONFIG' as level_4,
    f2q.opportunity_id as form2_opportunity_id,
    COUNT(f2q.id) as form2_question_count,
    '---' as conclusion,
    'FORM2 USES: opportunity_id + application (via startup.user_id = auth.users.id)' as answer
FROM opportunity_applications oa
JOIN startups s ON oa.startup_id = s.id
JOIN auth.users au ON s.user_id = au.id
JOIN incubation_opportunity_form2_questions f2q ON f2q.opportunity_id = oa.opportunity_id
WHERE oa.id = '1edcb779-378c-485a-8d01-9a0564f2b00f'
GROUP BY oa.id, oa.startup_id, s.user_id, au.id, au.email, f2q.opportunity_id;

-- ============================================================
-- EXPECTED ANSWER:
-- Form 2 system stores:
-- 1. Form questions linked to opportunity_id
-- 2. Responses (if exists) linked to application_id or startup_id
-- 3. Startup verification via startups.user_id = auth.users.id (AUTH USER ID)
-- 4. RLS enforces access via auth.uid() = startups.user_id
-- CONCLUSION: FORM2 USES AUTH USER ID (NOT PROFILE ID)
-- ============================================================
