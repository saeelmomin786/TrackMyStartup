-- =====================================================
-- VERIFY PAYMENT SYSTEM INTEGRITY
-- =====================================================
-- This script verifies that all payment-related tables,
-- constraints, and data are properly set up

-- =====================================================
-- 1. CHECK SUBSCRIPTION PLANS
-- =====================================================

DO $$
DECLARE
    basic_count INTEGER;
    premium_count INTEGER;
    plans_without_tier INTEGER;
BEGIN
    -- Check Basic plans
    SELECT COUNT(*) INTO basic_count
    FROM subscription_plans
    WHERE plan_tier = 'basic'
      AND user_type = 'Startup'
      AND interval = 'monthly'
      AND is_active = true;
    
    -- Check Premium plans
    SELECT COUNT(*) INTO premium_count
    FROM subscription_plans
    WHERE plan_tier = 'premium'
      AND user_type = 'Startup'
      AND interval = 'monthly'
      AND is_active = true;
    
    -- Check for plans without plan_tier
    SELECT COUNT(*) INTO plans_without_tier
    FROM subscription_plans
    WHERE plan_tier IS NULL
      AND user_type = 'Startup'
      AND is_active = true;
    
    RAISE NOTICE '========================================';
    RAISE NOTICE 'SUBSCRIPTION PLANS CHECK';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Basic plans (Startup, monthly): %', basic_count;
    RAISE NOTICE 'Premium plans (Startup, monthly): %', premium_count;
    RAISE NOTICE 'Plans without plan_tier: %', plans_without_tier;
    
    IF basic_count = 0 THEN
        RAISE WARNING '⚠️ No Basic plans found!';
    END IF;
    
    IF premium_count = 0 THEN
        RAISE WARNING '⚠️ No Premium plans found!';
    END IF;
    
    IF plans_without_tier > 0 THEN
        RAISE WARNING '⚠️ Found % plans without plan_tier set', plans_without_tier;
    END IF;
END $$;

-- =====================================================
-- 2. CHECK USER SUBSCRIPTIONS
-- =====================================================

DO $$
DECLARE
    active_subs INTEGER;
    subs_without_plan_tier INTEGER;
    subs_without_autopay INTEGER;
    subs_with_autopay INTEGER;
BEGIN
    -- Count active subscriptions
    SELECT COUNT(*) INTO active_subs
    FROM user_subscriptions
    WHERE status = 'active';
    
    -- Count subscriptions without plan_tier (if column exists)
    BEGIN
        SELECT COUNT(*) INTO subs_without_plan_tier
        FROM user_subscriptions us
        WHERE us.status = 'active'
          AND NOT EXISTS (
              SELECT 1 FROM subscription_plans sp
              WHERE sp.id = us.plan_id
              AND sp.plan_tier IS NOT NULL
          );
    EXCEPTION WHEN OTHERS THEN
        subs_without_plan_tier := 0;
    END;
    
    -- Count subscriptions with/without autopay
    SELECT 
        COUNT(*) FILTER (WHERE autopay_enabled = true),
        COUNT(*) FILTER (WHERE autopay_enabled = false OR autopay_enabled IS NULL)
    INTO subs_with_autopay, subs_without_autopay
    FROM user_subscriptions
    WHERE status = 'active';
    
    RAISE NOTICE '========================================';
    RAISE NOTICE 'USER SUBSCRIPTIONS CHECK';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Active subscriptions: %', active_subs;
    RAISE NOTICE 'Subscriptions with autopay enabled: %', subs_with_autopay;
    RAISE NOTICE 'Subscriptions without autopay: %', subs_without_autopay;
    RAISE NOTICE 'Subscriptions with plans missing plan_tier: %', subs_without_plan_tier;
END $$;

-- =====================================================
-- 3. CHECK PAYMENT TRANSACTIONS
-- =====================================================

DO $$
DECLARE
    total_transactions INTEGER;
    transactions_without_tier INTEGER;
    successful_transactions INTEGER;
    failed_transactions INTEGER;
    autopay_transactions INTEGER;
BEGIN
    -- Count all transactions
    SELECT COUNT(*) INTO total_transactions
    FROM payment_transactions;
    
    -- Count transactions without plan_tier (should be 0)
    SELECT COUNT(*) INTO transactions_without_tier
    FROM payment_transactions
    WHERE plan_tier IS NULL;
    
    -- Count by status
    SELECT 
        COUNT(*) FILTER (WHERE status = 'success'),
        COUNT(*) FILTER (WHERE status = 'failed')
    INTO successful_transactions, failed_transactions
    FROM payment_transactions;
    
    -- Count autopay transactions
    SELECT COUNT(*) INTO autopay_transactions
    FROM payment_transactions
    WHERE is_autopay = true;
    
    RAISE NOTICE '========================================';
    RAISE NOTICE 'PAYMENT TRANSACTIONS CHECK';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Total transactions: %', total_transactions;
    RAISE NOTICE 'Successful transactions: %', successful_transactions;
    RAISE NOTICE 'Failed transactions: %', failed_transactions;
    RAISE NOTICE 'Autopay transactions: %', autopay_transactions;
    RAISE NOTICE 'Transactions without plan_tier: %', transactions_without_tier;
    
    IF transactions_without_tier > 0 THEN
        RAISE WARNING '⚠️ Found % transactions without plan_tier!', transactions_without_tier;
    END IF;
END $$;

-- =====================================================
-- 4. CHECK TABLE CONSTRAINTS
-- =====================================================

DO $$
DECLARE
    constraint_exists BOOLEAN;
BEGIN
    -- Check if unique constraint exists on subscription_plans
    SELECT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'unique_subscription_plan_name_user_interval_country'
        AND table_name = 'subscription_plans'
        AND table_schema = 'public'
    ) INTO constraint_exists;
    
    RAISE NOTICE '========================================';
    RAISE NOTICE 'TABLE CONSTRAINTS CHECK';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Unique constraint on subscription_plans: %', 
        CASE WHEN constraint_exists THEN '✅ EXISTS' ELSE '❌ MISSING' END;
    
    -- Check if plan_tier NOT NULL constraint exists on payment_transactions
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'payment_transactions'
        AND column_name = 'plan_tier'
        AND is_nullable = 'NO'
        AND table_schema = 'public'
    ) INTO constraint_exists;
    
    RAISE NOTICE 'plan_tier NOT NULL on payment_transactions: %', 
        CASE WHEN constraint_exists THEN '✅ EXISTS' ELSE '❌ MISSING' END;
END $$;

-- =====================================================
-- 5. CHECK RECENT PAYMENTS
-- =====================================================

DO $$
DECLARE
    recent_payment RECORD;
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'RECENT PAYMENTS (Last 5)';
    RAISE NOTICE '========================================';
    
    FOR recent_payment IN
        SELECT 
            pt.id,
            pt.user_id,
            pt.plan_tier,
            pt.status,
            pt.payment_type,
            pt.is_autopay,
            pt.amount,
            pt.currency,
            pt.created_at,
            us.id as subscription_id,
            sp.name as plan_name
        FROM payment_transactions pt
        LEFT JOIN user_subscriptions us ON pt.subscription_id = us.id
        LEFT JOIN subscription_plans sp ON us.plan_id = sp.id
        ORDER BY pt.created_at DESC
        LIMIT 5
    LOOP
        RAISE NOTICE '---';
        RAISE NOTICE 'Payment ID: %', recent_payment.id;
        RAISE NOTICE 'User ID: %', recent_payment.user_id;
        RAISE NOTICE 'Plan Tier: %', recent_payment.plan_tier;
        RAISE NOTICE 'Status: %', recent_payment.status;
        RAISE NOTICE 'Payment Type: %', recent_payment.payment_type;
        RAISE NOTICE 'Autopay: %', recent_payment.is_autopay;
        RAISE NOTICE 'Amount: % %', recent_payment.amount, recent_payment.currency;
        RAISE NOTICE 'Plan Name: %', recent_payment.plan_name;
        RAISE NOTICE 'Created: %', recent_payment.created_at;
    END LOOP;
END $$;

-- =====================================================
-- 6. CHECK FEATURE ACCESS FUNCTIONS
-- =====================================================

DO $$
DECLARE
    function_exists BOOLEAN;
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'FUNCTIONS CHECK';
    RAISE NOTICE '========================================';
    
    -- Check get_user_plan_tier function
    SELECT EXISTS (
        SELECT 1 FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public'
        AND p.proname = 'get_user_plan_tier'
    ) INTO function_exists;
    
    RAISE NOTICE 'get_user_plan_tier function: %', 
        CASE WHEN function_exists THEN '✅ EXISTS' ELSE '❌ MISSING' END;
    
    -- Check can_user_access_feature function
    SELECT EXISTS (
        SELECT 1 FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public'
        AND p.proname = 'can_user_access_feature'
    ) INTO function_exists;
    
    RAISE NOTICE 'can_user_access_feature function: %', 
        CASE WHEN function_exists THEN '✅ EXISTS' ELSE '❌ MISSING' END;
END $$;

-- =====================================================
-- SUMMARY
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'VERIFICATION COMPLETE';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Review the output above for any warnings or errors.';
    RAISE NOTICE 'All checks should show ✅ for a healthy system.';
END $$;
