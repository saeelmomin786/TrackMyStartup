-- =====================================================
-- CHECK: Do we need to run backfill script?
-- =====================================================
-- This checks if all users already have user_profiles rows
-- =====================================================

-- Check 1: Count users missing from user_profiles
SELECT 
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ NO BACKFILL NEEDED - All users already have user_profiles rows'
        ELSE '❌ BACKFILL NEEDED - ' || COUNT(*) || ' users are missing user_profiles rows'
    END as backfill_status,
    COUNT(*) as missing_count
FROM public.users u
WHERE NOT EXISTS (
    SELECT 1 FROM public.user_profiles up 
    WHERE up.auth_user_id = u.id
);

-- Check 2: Show summary counts
SELECT 
    (SELECT COUNT(*) FROM public.users) as total_users,
    (SELECT COUNT(*) FROM public.user_profiles) as total_user_profiles,
    (SELECT COUNT(*) FROM public.users u
     WHERE EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.auth_user_id = u.id)
    ) as users_with_profiles,
    (SELECT COUNT(*) FROM public.users u
     WHERE NOT EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.auth_user_id = u.id)
    ) as users_without_profiles;

-- Check 3: If missing, show which users are missing (first 10)
SELECT 
    'Missing Users (first 10)' as info,
    u.id,
    u.email,
    u.name,
    u.role
FROM public.users u
WHERE NOT EXISTS (
    SELECT 1 FROM public.user_profiles up 
    WHERE up.auth_user_id = u.id
)
LIMIT 10;

-- Check 4: Final recommendation
SELECT 
    CASE 
        WHEN NOT EXISTS (
            SELECT 1 FROM public.users u
            WHERE NOT EXISTS (
                SELECT 1 FROM public.user_profiles up 
                WHERE up.auth_user_id = u.id
            )
        ) THEN '✅ SKIP BACKFILL - All users already have profiles'
        ELSE '⚠️ RUN BACKFILL - Some users are missing profiles'
    END as recommendation;

