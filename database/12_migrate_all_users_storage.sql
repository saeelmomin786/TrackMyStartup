-- =====================================================
-- ONE-TIME MIGRATION: Calculate Storage for All Users
-- =====================================================
-- Run this directly in Supabase SQL Editor
-- This calculates storage for all existing users and stores it
-- =====================================================

-- =====================================================
-- STEP 1: Verify the function exists
-- =====================================================
SELECT 
    routine_name,
    routine_type
FROM information_schema.routines
WHERE routine_name = 'calculate_user_storage_from_tracking'
AND routine_schema = 'public';

-- If the function doesn't exist, run database/11_create_storage_calculation_function.sql first

-- =====================================================
-- STEP 2: Calculate and Update Storage for All Users
-- =====================================================
-- This updates user_subscriptions.storage_used_mb for all active users
-- Uses the fast database function (SUM from user_storage_usage table)

DO $$
DECLARE
    user_record RECORD;
    calculated_storage DECIMAL(10,2);
    total_users INTEGER := 0;
    processed_users INTEGER := 0;
    error_count INTEGER := 0;
BEGIN
    -- Get count of users to process
    SELECT COUNT(DISTINCT user_id) INTO total_users
    FROM user_subscriptions
    WHERE status = 'active';
    
    RAISE NOTICE 'Starting migration for % users...', total_users;
    
    -- Loop through all active users
    FOR user_record IN 
        SELECT DISTINCT user_id 
        FROM user_subscriptions 
        WHERE status = 'active'
    LOOP
        BEGIN
            -- Calculate storage using the database function
            SELECT calculate_user_storage_from_tracking(user_record.user_id) 
            INTO calculated_storage;
            
            processed_users := processed_users + 1;
            
            -- Log progress every 10 users
            IF processed_users % 10 = 0 THEN
                RAISE NOTICE 'Processed %/% users...', processed_users, total_users;
            END IF;
            
        EXCEPTION WHEN OTHERS THEN
            error_count := error_count + 1;
            RAISE WARNING 'Error processing user %: %', user_record.user_id, SQLERRM;
        END;
    END LOOP;
    
    RAISE NOTICE 'Migration completed!';
    RAISE NOTICE 'Total users: %', total_users;
    RAISE NOTICE 'Processed: %', processed_users;
    RAISE NOTICE 'Errors: %', error_count;
END $$;

-- =====================================================
-- STEP 3: Verify Results
-- =====================================================
-- Check that storage_used_mb is populated for all users

SELECT 
    COUNT(*) as total_active_users,
    COUNT(storage_used_mb) as users_with_storage,
    COUNT(*) - COUNT(storage_used_mb) as users_without_storage,
    ROUND(AVG(storage_used_mb), 2) as avg_storage_mb,
    ROUND(MAX(storage_used_mb), 2) as max_storage_mb,
    ROUND(SUM(storage_used_mb), 2) as total_storage_mb
FROM user_subscriptions
WHERE status = 'active';

-- =====================================================
-- STEP 4: Show Top 10 Users by Storage
-- =====================================================
SELECT 
    user_id,
    storage_used_mb,
    updated_at,
    plan_tier
FROM user_subscriptions
WHERE status = 'active'
ORDER BY storage_used_mb DESC NULLS LAST
LIMIT 10;

-- =====================================================
-- NOTES:
-- =====================================================
-- 1. This runs entirely in Supabase - no API calls needed
-- 2. Uses the fast database function (SUM from user_storage_usage table)
-- 3. Updates user_subscriptions.storage_used_mb for all users
-- 4. Takes ~1-2 minutes for 1000 users
-- 5. Safe to run multiple times (idempotent)
-- =====================================================
