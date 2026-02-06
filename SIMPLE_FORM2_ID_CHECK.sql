-- What IDs does Form 2 system use?

-- 1. Form 2 Questions Configuration
SELECT 
    'FORM2 QUESTIONS' as table_name,
    f2q.opportunity_id,
    io.facilitator_id as "uses_facilitator_auth_user_id",
    COUNT(*) as question_count
FROM incubation_opportunity_form2_questions f2q
JOIN incubation_opportunities io ON f2q.opportunity_id = io.id
WHERE f2q.opportunity_id = '60437153-aa15-4c74-88b5-135d6d7afcfd'
GROUP BY f2q.opportunity_id, io.facilitator_id;

-- 2. Form 2 Access Chain
SELECT 
    'FORM2 ACCESS' as verification,
    oa.id as application_id,
    s.user_id as "startup_user_id",
    au.id as "auth_user_id",
    CASE 
        WHEN s.user_id = au.id THEN '✅ FORM2 ACCESSED VIA AUTH.USERS.ID'
        ELSE '❌ Different ID'
    END as form2_access_method
FROM opportunity_applications oa
JOIN startups s ON oa.startup_id = s.id
JOIN auth.users au ON s.user_id = au.id
WHERE oa.id = '1edcb779-378c-485a-8d01-9a0564f2b00f';

-- 3. Check for Form 2 response tables
SELECT 
    table_name,
    column_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name LIKE '%form2%'
  AND (column_name LIKE '%user%' OR column_name LIKE '%startup%' OR column_name LIKE '%application%')
ORDER BY table_name, column_name;
