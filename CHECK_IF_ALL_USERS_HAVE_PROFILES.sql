-- =====================================================
-- CHECK IF ALL USERS ARE IN user_profiles TABLE
-- =====================================================
-- Run this BEFORE using the NO_FALLBACK version
-- This will tell you if it's safe to remove the fallback

-- Check 1: Count users in users table vs user_profiles
SELECT 
    'users table' as source,
    COUNT(DISTINCT id) as user_count
FROM public.users
UNION ALL
SELECT 
    'user_profiles table' as source,
    COUNT(DISTINCT auth_user_id) as user_count
FROM public.user_profiles;

-- Check 2: Find users in users table that DON'T have profiles in user_profiles
SELECT 
    u.id,
    u.email,
    u.name,
    u.role,
    CASE 
        WHEN up.id IS NULL THEN '❌ NO PROFILE'
        ELSE '✅ HAS PROFILE'
    END as profile_status
FROM public.users u
LEFT JOIN public.user_profiles up ON u.id = up.auth_user_id
WHERE up.id IS NULL
ORDER BY u.created_at DESC
LIMIT 20;

-- Check 3: Summary
SELECT 
    (SELECT COUNT(*) FROM public.users) as total_users_in_users_table,
    (SELECT COUNT(DISTINCT auth_user_id) FROM public.user_profiles) as total_users_in_user_profiles,
    (SELECT COUNT(*) 
     FROM public.users u 
     LEFT JOIN public.user_profiles up ON u.id = up.auth_user_id 
     WHERE up.id IS NULL) as users_missing_profiles,
    CASE 
        WHEN (SELECT COUNT(*) 
              FROM public.users u 
              LEFT JOIN public.user_profiles up ON u.id = up.auth_user_id 
              WHERE up.id IS NULL) = 0 
        THEN '✅ SAFE TO REMOVE FALLBACK - All users have profiles'
        ELSE '⚠️ KEEP FALLBACK - Some users missing profiles'
    END as recommendation;



