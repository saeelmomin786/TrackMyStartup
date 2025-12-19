-- =====================================================
-- VERIFY MIGRATION IS COMPLETE
-- =====================================================
-- This checks if migration was successful (using indexes instead of FK constraints)
-- =====================================================

-- Check 1: Verify indexes exist for key tables
SELECT 
    'Index Check' as check_type,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_indexes 
            WHERE schemaname = 'public' 
            AND tablename = 'investment_offers'
            AND indexname = 'idx_investment_offers_investor_id'
        ) THEN '✅ investment_offers index exists'
        ELSE '❌ investment_offers index missing'
    END as investment_offers_status,
    
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_indexes 
            WHERE schemaname = 'public' 
            AND tablename = 'startups'
            AND indexname = 'idx_startups_user_id'
        ) THEN '✅ startups index exists'
        ELSE '❌ startups index missing'
    END as startups_status,
    
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_indexes 
            WHERE schemaname = 'public' 
            AND tablename = 'co_investment_offers'
            AND indexname = 'idx_co_investment_offers_investor_id'
        ) THEN '✅ co_investment_offers index exists'
        ELSE '❌ co_investment_offers index missing'
    END as co_investment_offers_status;

-- Check 2: Verify all data is valid (all IDs exist in user_profiles)
SELECT 
    'Data Integrity Check' as check_type,
    CASE 
        WHEN NOT EXISTS (
            SELECT 1 FROM public.investment_offers io
            WHERE io.investor_id IS NOT NULL 
            AND NOT EXISTS (
                SELECT 1 FROM public.user_profiles up 
                WHERE up.auth_user_id = io.investor_id
                AND up.role = 'Investor'
            )
        ) THEN '✅ All investment_offers have valid investor_id'
        ELSE '❌ Some investment_offers have invalid investor_id'
    END as investment_offers_data_status,
    
    CASE 
        WHEN NOT EXISTS (
            SELECT 1 FROM public.startups s
            WHERE s.user_id IS NOT NULL 
            AND NOT EXISTS (
                SELECT 1 FROM public.user_profiles up 
                WHERE up.auth_user_id = s.user_id
                AND up.role = 'Startup'
            )
        ) THEN '✅ All startups have valid user_id'
        ELSE '❌ Some startups have invalid user_id'
    END as startups_data_status;

-- Check 3: Final status
SELECT 
    '=== MIGRATION STATUS ===' as summary,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_indexes 
            WHERE schemaname = 'public' 
            AND tablename = 'investment_offers'
            AND indexname = 'idx_investment_offers_investor_id'
        )
        AND EXISTS (
            SELECT 1 FROM pg_indexes 
            WHERE schemaname = 'public' 
            AND tablename = 'startups'
            AND indexname = 'idx_startups_user_id'
        )
        AND NOT EXISTS (
            SELECT 1 FROM public.investment_offers io
            WHERE io.investor_id IS NOT NULL 
            AND NOT EXISTS (
                SELECT 1 FROM public.user_profiles up 
                WHERE up.auth_user_id = io.investor_id
                AND up.role = 'Investor'
            )
        )
        THEN '✅ MIGRATION COMPLETE - Indexes created, data validated'
        ELSE '⚠️ MIGRATION INCOMPLETE - Check individual status above'
    END as final_status;

