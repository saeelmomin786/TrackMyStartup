-- Dashboard Form 2 Check: Profile ID or Auth ID?

-- Simulate what happens when user views dashboard
SELECT 
    'DASHBOARD CHECK' as check_type,
    au.id as "logged_in_auth_uid",
    au.email,
    s.user_id as "startup_user_id_column",
    CASE 
        WHEN s.user_id = au.id THEN '✅ MATCH: Dashboard uses auth.uid() = startups.user_id'
        ELSE '❌ NO MATCH'
    END as "how_dashboard_checks",
    oa.form2_requested as show_form2_button,
    COUNT(f2q.id) as questions_available,
    '---' as separator,
    'ANSWER: USES AUTH USER ID (auth.uid())' as conclusion
FROM auth.users au
JOIN startups s ON s.user_id = au.id  -- ← KEY: Dashboard joins on auth.users.id
JOIN opportunity_applications oa ON oa.startup_id = s.id
LEFT JOIN incubation_opportunity_form2_questions f2q ON f2q.opportunity_id = oa.opportunity_id
WHERE au.id = '6ce30399-7b8e-4bbc-a1cc-57aec37b2526'
GROUP BY au.id, au.email, s.user_id, oa.form2_requested;

-- Test with wrong user to show RLS blocking
SELECT 
    'WRONG USER TEST' as test,
    '❌ If logged in as: acec7880-0c9f-4757-b521-1bffd39dce25' as wrong_user,
    'Result: 0 rows (RLS blocks because startups.user_id ≠ auth.uid())' as what_happens,
    'Dashboard shows: No applications, no Form 2' as ui_result;
