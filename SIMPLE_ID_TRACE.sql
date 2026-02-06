-- Quick check: What ID does startups table store?
SELECT 
    oa.id as application_id,
    oa.startup_id as "app_stores_startup_id",
    s.id as "startup_pk",
    s.user_id as "startup_user_id_field",
    au.id as "auth_users_id",
    au.email,
    CASE 
        WHEN s.user_id = au.id THEN '✅ STORES AUTH.USERS.ID (NOT PROFILE)'
        ELSE '❌ Stores something else'
    END as "ROOT CAUSE ANSWER"
FROM opportunity_applications oa
JOIN startups s ON oa.startup_id = s.id
JOIN auth.users au ON s.user_id = au.id
WHERE oa.id = '1edcb779-378c-485a-8d01-9a0564f2b00f';
