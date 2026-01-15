-- =====================================================
-- CREATE FREE PLAN SUBSCRIPTIONS & MIGRATE STORAGE
-- =====================================================
-- This script:
-- 1. Gets or creates the free plan
-- 2. Creates free plan subscriptions for all users who don't have one
-- 3. Calculates and updates storage_used_mb for all users
-- =====================================================

-- =====================================================
-- STEP 1: Ensure Free Plan Exists
-- =====================================================

-- Get or create free plan
INSERT INTO subscription_plans (
    name,
    price,
    currency,
    interval,
    description,
    user_type,
    country,
    is_active,
    plan_tier,
    storage_limit_mb
) VALUES (
    'Free Plan - Startup',
    0.00,
    'EUR',
    'monthly',
    'Free plan with basic features - 100 MB storage',
    'Startup',
    'Global',
    true,
    'free',
    100
)
ON CONFLICT (name, user_type, interval, country) 
DO UPDATE SET
    plan_tier = 'free',
    storage_limit_mb = 100,
    updated_at = NOW();

-- Get the free plan ID
DO $$
DECLARE
    free_plan_id UUID;
    user_record RECORD;
    created_count INTEGER := 0;
    updated_count INTEGER := 0;
BEGIN
    -- Get free plan ID
    SELECT id INTO free_plan_id
    FROM subscription_plans
    WHERE plan_tier = 'free'
    AND user_type = 'Startup'
    AND is_active = true
    LIMIT 1;

    IF free_plan_id IS NULL THEN
        RAISE EXCEPTION 'Free plan not found. Please create it first.';
    END IF;

    RAISE NOTICE 'Free plan ID: %', free_plan_id;

    -- =====================================================
    -- STEP 2: Create Free Plan Subscriptions for All Users
    -- =====================================================
    -- Get all users from auth.users who don't have a subscription

    FOR user_record IN 
        SELECT DISTINCT u.id as user_id
        FROM auth.users u
        WHERE NOT EXISTS (
            SELECT 1 
            FROM user_subscriptions us
            WHERE us.user_id = u.id
        )
    LOOP
        BEGIN
            -- Create free plan subscription
            -- Note: plan_tier might not exist in user_subscriptions, so we'll get it from the plan
            INSERT INTO user_subscriptions (
                user_id,
                plan_id,
                status,
                current_period_start,
                current_period_end,
                amount,
                interval,
                storage_used_mb,
                created_at,
                updated_at
            ) VALUES (
                user_record.user_id,
                free_plan_id,
                'active',
                NOW(),
                NOW() + INTERVAL '1 month',
                0.00,
                'monthly',
                0, -- Will be calculated in next step
                NOW(),
                NOW()
            )
            ON CONFLICT (user_id, plan_id) DO NOTHING;

            created_count := created_count + 1;

            IF created_count % 10 = 0 THEN
                RAISE NOTICE 'Created % free subscriptions...', created_count;
            END IF;

        EXCEPTION WHEN OTHERS THEN
            RAISE WARNING 'Error creating subscription for user %: %', user_record.user_id, SQLERRM;
        END;
    END LOOP;

    RAISE NOTICE 'Created % free plan subscriptions', created_count;

    -- =====================================================
    -- STEP 3: Calculate and Update Storage for All Users
    -- =====================================================

    -- Update storage_used_mb for all subscriptions
    UPDATE user_subscriptions us
    SET 
        storage_used_mb = COALESCE((
            SELECT SUM(file_size_mb)
            FROM user_storage_usage
            WHERE user_id = us.user_id
        ), 0),
        updated_at = NOW()
    WHERE EXISTS (
        SELECT 1 
        FROM user_storage_usage 
        WHERE user_id = us.user_id
    );

    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RAISE NOTICE 'Updated storage for % subscriptions', updated_count;

    -- Also update subscriptions for users with no files (set to 0)
    UPDATE user_subscriptions
    SET 
        storage_used_mb = 0,
        updated_at = NOW()
    WHERE storage_used_mb IS NULL;

    RAISE NOTICE 'Migration completed!';
END $$;

-- =====================================================
-- STEP 4: Verify Results
-- =====================================================

-- Check subscriptions created
SELECT 
    'Subscriptions Created' as info,
    COUNT(*) as total_subscriptions,
    COUNT(CASE WHEN status = 'active' THEN 1 END) as active_count,
    COUNT(CASE WHEN amount = 0 THEN 1 END) as free_plan_count
FROM user_subscriptions;

-- Check storage calculation
SELECT 
    'Storage Calculation' as info,
    COUNT(*) as total_subscriptions,
    COUNT(storage_used_mb) as with_storage,
    COUNT(CASE WHEN storage_used_mb > 0 THEN 1 END) as with_files,
    ROUND(AVG(storage_used_mb), 2) as avg_storage_mb,
    ROUND(MAX(storage_used_mb), 2) as max_storage_mb,
    ROUND(SUM(storage_used_mb), 2) as total_storage_mb
FROM user_subscriptions;

-- Show top 10 users by storage
SELECT 
    'Top Users by Storage' as info,
    us.user_id,
    sp.plan_tier,
    us.status,
    us.storage_used_mb,
    us.updated_at
FROM user_subscriptions us
LEFT JOIN subscription_plans sp ON us.plan_id = sp.id
WHERE us.storage_used_mb > 0
ORDER BY us.storage_used_mb DESC
LIMIT 10;

-- =====================================================
-- NOTES:
-- =====================================================
-- This script:
-- 1. Creates free plan if it doesn't exist
-- 2. Creates free plan subscriptions for all users without subscriptions
-- 3. Calculates storage_used_mb from user_storage_usage table
-- 4. Updates all subscriptions with calculated storage
-- 
-- After this, all users will have:
-- - A free plan subscription record
-- - storage_used_mb calculated and stored
-- =====================================================
