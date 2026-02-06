-- ============================================================
-- TRACE STARTUP APPLICATION IDS
-- Purpose: Determine what ID is stored when startup applies
-- Question: Does it store auth user_id or profile_id?
-- ============================================================

-- SECTION 1: Check the startups table structure and relationship to auth.users
-- This shows what ID type is used for startups
SELECT 
    '=== STARTUPS TABLE STRUCTURE ===' as section,
    s.id as startup_table_id,
    s.user_id as startup_user_id_field,
    au.id as auth_users_id,
    au.email as auth_email,
    CASE 
        WHEN s.user_id = au.id THEN '✅ MATCHES auth.users.id'
        ELSE '❌ DOES NOT MATCH'
    END as id_type_verification
FROM startups s
LEFT JOIN auth.users au ON s.user_id = au.id
WHERE s.user_id = '6ce30399-7b8e-4bbc-a1cc-57aec37b2526'
LIMIT 5;

-- SECTION 2: Check the opportunity_applications table
-- What does it store when startup applies?
SELECT 
    '=== OPPORTUNITY_APPLICATIONS TABLE ===' as section,
    oa.id as application_id,
    oa.startup_id as application_startup_id_field,
    oa.created_at,
    s.id as startups_table_id,
    s.user_id as startups_user_id,
    au.id as auth_users_id,
    au.email,
    CASE 
        WHEN oa.startup_id = s.id THEN '✅ Links to startups.id'
        ELSE '❌ Mismatch'
    END as startup_id_verification,
    CASE 
        WHEN s.user_id = au.id THEN '✅ startup.user_id = auth.users.id'
        ELSE '❌ Mismatch'
    END as user_id_verification
FROM opportunity_applications oa
LEFT JOIN startups s ON oa.startup_id = s.id
LEFT JOIN auth.users au ON s.user_id = au.id
WHERE oa.id = '1edcb779-378c-485a-8d01-9a0564f2b00f';

-- SECTION 3: Full ID chain for the specific application
SELECT 
    '=== COMPLETE ID CHAIN ===' as section,
    oa.id as application_id,
    oa.startup_id as "Application stores: startup_id",
    s.id as "Startups table: id (PK)",
    s.user_id as "Startups table: user_id (FK)",
    au.id as "Auth.users: id (PK)",
    au.email as "Auth.users: email",
    '---' as separator,
    CASE 
        WHEN oa.startup_id = s.id THEN 'YES'
        ELSE 'NO'
    END as "Does application.startup_id = startups.id?",
    CASE 
        WHEN s.user_id = au.id THEN 'YES'
        ELSE 'NO'
    END as "Does startups.user_id = auth.users.id?",
    '---' as conclusion,
    CASE 
        WHEN s.user_id = au.id THEN 'STORES AUTH USER ID (not profile)'
        ELSE 'STORES SOMETHING ELSE'
    END as final_answer
FROM opportunity_applications oa
JOIN startups s ON oa.startup_id = s.id
JOIN auth.users au ON s.user_id = au.id
WHERE oa.id = '1edcb779-378c-485a-8d01-9a0564f2b00f';

-- SECTION 4: Check if there's any profile_id column in startups table
-- (This will error if profile_id doesn't exist, confirming it uses auth id)
SELECT 
    '=== CHECKING FOR PROFILE_ID COLUMN ===' as section,
    column_name,
    data_type,
    CASE 
        WHEN column_name = 'user_id' THEN '✅ This is the auth.users.id reference'
        WHEN column_name LIKE '%profile%' THEN '⚠️ Profile-related column found'
        ELSE 'Other column'
    END as column_purpose
FROM information_schema.columns
WHERE table_name = 'startups' 
  AND table_schema = 'public'
  AND column_name IN ('user_id', 'profile_id', 'auth_user_id')
ORDER BY column_name;

-- SECTION 5: Sample multiple applications to confirm pattern
SELECT 
    '=== PATTERN VERIFICATION (Multiple Applications) ===' as section,
    oa.id as application_id,
    oa.startup_id,
    s.id as startup_pk,
    s.user_id as startup_user_id,
    au.email,
    CASE 
        WHEN s.user_id = au.id THEN '✅ AUTH ID'
        ELSE '❌ MISMATCH'
    END as id_type
FROM opportunity_applications oa
JOIN startups s ON oa.startup_id = s.id
JOIN auth.users au ON s.user_id = au.id
LIMIT 10;

-- ============================================================
-- ANSWER:
-- When a startup applies for a program:
-- 1. opportunity_applications.startup_id = startups.id (integer PK)
-- 2. startups.user_id = auth.users.id (UUID)
-- 3. Therefore: IT STORES AUTH USER ID, NOT PROFILE ID
-- ============================================================
