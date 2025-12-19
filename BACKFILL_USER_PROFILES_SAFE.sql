-- =====================================================
-- SAFE BACKFILL: Create missing user_profiles rows
-- =====================================================
-- This version only uses columns that definitely exist
-- =====================================================

-- Step 1: Create user_profiles rows for all users that don't have them
DO $$
DECLARE
    r RECORD;
    inserted_count INTEGER := 0;
    skipped_count INTEGER := 0;
BEGIN
    FOR r IN
        -- Only select columns that definitely exist in users table
        SELECT 
            u.id,
            u.email,
            u.name,
            u.role,
            COALESCE(u.registration_date, CURRENT_DATE) as registration_date,
            COALESCE(u.created_at, NOW()) as created_at,
            COALESCE(u.updated_at, NOW()) as updated_at
        FROM public.users u
        WHERE NOT EXISTS (
            SELECT 1 FROM public.user_profiles up 
            WHERE up.auth_user_id = u.id
        )
    LOOP
        BEGIN
            -- Insert with only required fields, optional fields set to NULL/defaults
            INSERT INTO public.user_profiles (
                auth_user_id,
                email,
                name,
                role,
                registration_date,
                created_at,
                updated_at,
                is_profile_complete  -- Set default for new profiles
            )
            VALUES (
                r.id,
                r.email,
                r.name,
                r.role,
                r.registration_date,
                r.created_at,
                r.updated_at,
                false  -- New profiles are not complete yet
            );
            
            inserted_count := inserted_count + 1;
        EXCEPTION WHEN OTHERS THEN
            skipped_count := skipped_count + 1;
            RAISE WARNING 'Skipped user % (email: %): %', r.id, r.email, SQLERRM;
        END;
    END LOOP;

    RAISE NOTICE '✅ Backfill complete:';
    RAISE NOTICE '   - Created % new user_profiles rows', inserted_count;
    IF skipped_count > 0 THEN
        RAISE WARNING '   - Skipped % users due to errors', skipped_count;
    END IF;
END $$;

-- Step 2: Verify all users now have user_profiles
SELECT 
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ SUCCESS: All users have matching user_profiles rows'
        ELSE '⚠️ WARNING: ' || COUNT(*) || ' users still missing user_profiles rows'
    END as status
FROM public.users u
WHERE NOT EXISTS (
    SELECT 1 FROM public.user_profiles up 
    WHERE up.auth_user_id = u.id
);

-- Step 3: Show summary
SELECT 
    (SELECT COUNT(*) FROM public.users) as total_users,
    (SELECT COUNT(*) FROM public.user_profiles) as total_user_profiles,
    (SELECT COUNT(*) FROM public.users u
     WHERE EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.auth_user_id = u.id)
    ) as users_with_profiles,
    (SELECT COUNT(*) FROM public.users u
     WHERE NOT EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.auth_user_id = u.id)
    ) as users_without_profiles;

