-- Find the correct email to login with
SELECT 
    'CORRECT LOGIN CREDENTIALS' as info,
    au.id as user_id,
    au.email as "email_to_login_with",
    s.id as startup_id,
    s.business_name,
    '---' as separator,
    'ACTION: Login with this email in your app' as next_step
FROM auth.users au
JOIN startups s ON s.user_id = au.id
WHERE au.id = '6ce30399-7b8e-4bbc-a1cc-57aec37b2526';

-- Verify application belongs to this user
SELECT 
    'VERIFICATION' as check,
    oa.id as application_id,
    oa.startup_id,
    io.program_name,
    oa.form2_requested,
    COUNT(f2q.id) as questions_configured,
    'This user will see Form 2 questions when logged in correctly' as result
FROM opportunity_applications oa
JOIN startups s ON oa.startup_id = s.id
JOIN incubation_opportunities io ON io.id = oa.opportunity_id
LEFT JOIN incubation_opportunity_form2_questions f2q ON f2q.opportunity_id = oa.opportunity_id
WHERE s.user_id = '6ce30399-7b8e-4bbc-a1cc-57aec37b2526'
  AND oa.form2_requested = true
GROUP BY oa.id, oa.startup_id, io.program_name, oa.form2_requested;
