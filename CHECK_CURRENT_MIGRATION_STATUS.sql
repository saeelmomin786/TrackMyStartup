-- =====================================================
-- CHECK CURRENT MIGRATION STATUS
-- =====================================================
-- Run this to see if migration to user_profiles is already done
-- =====================================================

-- Check 1: See which tables have foreign keys pointing to user_profiles
SELECT 
    'Foreign Keys to user_profiles' as check_type,
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    tc.constraint_name
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND ccu.table_name = 'user_profiles'
    AND tc.table_schema = 'public'
ORDER BY tc.table_name, kcu.column_name;

-- Check 2: See which tables still have foreign keys pointing to users
SELECT 
    'Foreign Keys to users (OLD - need migration)' as check_type,
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    tc.constraint_name
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND ccu.table_name = 'users'
    AND tc.table_schema = 'public'
    AND tc.table_name NOT IN ('user_profile_sessions') -- Ignore this one
ORDER BY tc.table_name, kcu.column_name;

-- Check 3: Check investment_offers specifically
SELECT 
    'investment_offers Foreign Keys' as check_type,
    tc.constraint_name,
    kcu.column_name,
    ccu.table_name AS references_table,
    ccu.column_name AS references_column
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage ccu 
    ON tc.constraint_name = ccu.constraint_name
WHERE tc.table_name = 'investment_offers'
    AND tc.constraint_type = 'FOREIGN KEY'
    AND (kcu.column_name LIKE '%investor%' OR kcu.column_name = 'investor_id' OR kcu.column_name = 'investor_email');

-- Check 4: Check if SQL functions use user_profiles or users
-- (This requires checking function definitions, shown as info)
SELECT 
    'SQL Functions Check' as info,
    'Check UPDATE_CREATE_INVESTMENT_OFFER_FUNCTION_FOR_CO_INVESTMENT.sql file' as note,
    'Functions should use user_profiles, not users table' as expected;

-- Check 5: Summary
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.table_constraints tc
            JOIN information_schema.constraint_column_usage ccu 
                ON tc.constraint_name = ccu.constraint_name
            WHERE tc.table_name = 'investment_offers'
                AND tc.constraint_type = 'FOREIGN KEY'
                AND ccu.table_name = 'user_profiles'
        ) THEN '✅ investment_offers already migrated to user_profiles'
        ELSE '❌ investment_offers still points to users - NEED MIGRATION'
    END as investment_offers_status,
    
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.table_constraints tc
            JOIN information_schema.constraint_column_usage ccu 
                ON tc.constraint_name = ccu.constraint_name
            WHERE tc.table_name = 'co_investment_offers'
                AND tc.constraint_type = 'FOREIGN KEY'
                AND ccu.table_name = 'user_profiles'
        ) THEN '✅ co_investment_offers already migrated'
        ELSE '❌ co_investment_offers still points to users - NEED MIGRATION'
    END as co_investment_offers_status,
    
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.table_constraints tc
            JOIN information_schema.constraint_column_usage ccu 
                ON tc.constraint_name = ccu.constraint_name
            WHERE tc.table_name = 'startups'
                AND tc.constraint_type = 'FOREIGN KEY'
                AND ccu.table_name = 'user_profiles'
                AND kcu.column_name = 'user_id'
        ) THEN '✅ startups already migrated'
        ELSE '❌ startups still points to users - NEED MIGRATION'
    END as startups_status;


