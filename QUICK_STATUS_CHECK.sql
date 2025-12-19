-- QUICK CHECK: Are foreign keys already pointing to user_profiles?
-- Run this first to see if you need to migrate

-- Check investment_offers (most important)
SELECT 
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
        ) THEN '✅ ALREADY MIGRATED - investment_offers points to user_profiles'
        ELSE '❌ NEED MIGRATION - investment_offers still points to users'
    END as investment_offers_status;

-- Check startups
SELECT 
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
        ) THEN '✅ ALREADY MIGRATED - startups points to user_profiles'
        ELSE '❌ NEED MIGRATION - startups still points to users'
    END as startups_status;

-- Check co_investment_offers
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.table_constraints tc
            JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
            JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
            WHERE tc.table_schema = 'public'
                AND tc.table_name = 'co_investment_offers'
                AND tc.constraint_type = 'FOREIGN KEY'
                AND kcu.column_name = 'investor_id'
                AND ccu.table_name = 'user_profiles'
        ) THEN '✅ ALREADY MIGRATED - co_investment_offers points to user_profiles'
        ELSE '❌ NEED MIGRATION - co_investment_offers still points to users'
    END as co_investment_offers_status;

-- FINAL DECISION
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.table_constraints tc
            JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
            JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
            WHERE tc.table_schema = 'public'
                AND tc.constraint_type = 'FOREIGN KEY'
                AND ccu.table_name = 'user_profiles'
                AND tc.table_name IN ('investment_offers', 'startups', 'co_investment_offers')
        ) THEN '✅ MIGRATION ALREADY DONE - You can skip migration steps!'
        ELSE '❌ MIGRATION NEEDED - Follow migration steps'
    END as final_status;
