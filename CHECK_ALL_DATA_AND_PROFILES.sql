-- =====================================================
-- COMPREHENSIVE CHECK: Verify all data and profiles exist
-- =====================================================
-- This checks if everything is already in place
-- =====================================================

-- Check 1: Users vs User Profiles
SELECT 
    'Users vs Profiles' as check_type,
    (SELECT COUNT(*) FROM public.users) as total_users,
    (SELECT COUNT(*) FROM public.user_profiles) as total_user_profiles,
    (SELECT COUNT(*) FROM public.users u
     WHERE EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.auth_user_id = u.id)
    ) as users_with_profiles,
    (SELECT COUNT(*) FROM public.users u
     WHERE NOT EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.auth_user_id = u.id)
    ) as users_without_profiles;

-- Check 2: Investment Offers - Check if investor_id values exist in user_profiles
SELECT 
    'Investment Offers Data' as check_type,
    (SELECT COUNT(*) FROM public.investment_offers) as total_offers,
    (SELECT COUNT(*) FROM public.investment_offers io
     WHERE io.investor_id IS NOT NULL 
     AND EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.auth_user_id = io.investor_id)
    ) as offers_with_valid_investor_id,
    (SELECT COUNT(*) FROM public.investment_offers io
     WHERE io.investor_id IS NOT NULL 
     AND NOT EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.auth_user_id = io.investor_id)
    ) as offers_with_missing_investor_id;

-- Check 3: Co-Investment Offers
SELECT 
    'Co-Investment Offers Data' as check_type,
    (SELECT COUNT(*) FROM public.co_investment_offers) as total_co_offers,
    (SELECT COUNT(*) FROM public.co_investment_offers cio
     WHERE cio.investor_id IS NOT NULL 
     AND EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.auth_user_id = cio.investor_id)
    ) as co_offers_with_valid_investor_id,
    (SELECT COUNT(*) FROM public.co_investment_offers cio
     WHERE cio.investor_id IS NOT NULL 
     AND NOT EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.auth_user_id = cio.investor_id)
    ) as co_offers_with_missing_investor_id;

-- Check 4: Startups
SELECT 
    'Startups Data' as check_type,
    (SELECT COUNT(*) FROM public.startups) as total_startups,
    (SELECT COUNT(*) FROM public.startups s
     WHERE s.user_id IS NOT NULL 
     AND EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.auth_user_id = s.user_id)
    ) as startups_with_valid_user_id,
    (SELECT COUNT(*) FROM public.startups s
     WHERE s.user_id IS NOT NULL 
     AND NOT EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.auth_user_id = s.user_id)
    ) as startups_with_missing_user_id;

-- Check 5: Co-Investment Opportunities
SELECT 
    'Co-Investment Opportunities Data' as check_type,
    (SELECT COUNT(*) FROM public.co_investment_opportunities) as total_opportunities,
    (SELECT COUNT(*) FROM public.co_investment_opportunities cio
     WHERE cio.listed_by_user_id IS NOT NULL 
     AND EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.auth_user_id = cio.listed_by_user_id)
    ) as opportunities_with_valid_user_id,
    (SELECT COUNT(*) FROM public.co_investment_opportunities cio
     WHERE cio.listed_by_user_id IS NOT NULL 
     AND NOT EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.auth_user_id = cio.listed_by_user_id)
    ) as opportunities_with_missing_user_id;

-- Check 6: Current Foreign Key Status
SELECT 
    'Foreign Key Status' as check_type,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.table_constraints tc
            JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
            JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
            WHERE tc.table_schema = 'public'
                AND tc.table_name = 'investment_offers'
                AND tc.constraint_type = 'FOREIGN KEY'
                AND (kcu.column_name = 'investor_id' OR kcu.column_name = 'investor_email')
                AND ccu.table_name = 'user_profiles'
        ) THEN '✅ investment_offers FK points to user_profiles'
        ELSE '❌ investment_offers FK points to users (needs migration)'
    END as investment_offers_fk_status,
    
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.table_constraints tc
            JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
            JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
            WHERE tc.table_schema = 'public'
                AND tc.table_name = 'startups'
                AND tc.constraint_type = 'FOREIGN KEY'
                AND kcu.column_name = 'user_id'
                AND ccu.table_name = 'user_profiles'
        ) THEN '✅ startups FK points to user_profiles'
        ELSE '❌ startups FK points to users (needs migration)'
    END as startups_fk_status;

-- Check 7: FINAL SUMMARY
SELECT 
    '=== FINAL SUMMARY ===' as summary,
    CASE 
        WHEN (
            -- All users have profiles
            NOT EXISTS (
                SELECT 1 FROM public.users u
                WHERE NOT EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.auth_user_id = u.id)
            )
            -- All investment_offers have valid investor_id
            AND NOT EXISTS (
                SELECT 1 FROM public.investment_offers io
                WHERE io.investor_id IS NOT NULL 
                AND NOT EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.auth_user_id = io.investor_id)
            )
            -- All startups have valid user_id
            AND NOT EXISTS (
                SELECT 1 FROM public.startups s
                WHERE s.user_id IS NOT NULL 
                AND NOT EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.auth_user_id = s.user_id)
            )
        ) THEN '✅ ALL DATA IS READY - All users have profiles, all IDs are valid'
        ELSE '⚠️ SOME DATA MISSING - Check individual checks above'
    END as overall_status;

