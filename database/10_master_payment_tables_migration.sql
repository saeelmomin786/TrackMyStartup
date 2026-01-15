-- =====================================================
-- MASTER MIGRATION: PAYMENT SYSTEM TABLES
-- =====================================================
-- Run this script to create all payment-related tables
--
-- Execution order:
-- 1. Country plan prices
-- 2. Enhance user subscriptions
-- 3. Payment transactions
-- 4. Billing cycles
-- 5. Subscription changes
--
-- =====================================================

-- Step 1: Create country plan prices table
\i database/05_create_country_plan_prices.sql

-- Step 2: Enhance user subscriptions table
\i database/06_enhance_user_subscriptions.sql

-- Step 3: Create payment transactions table
\i database/07_create_payment_transactions.sql

-- Step 4: Create billing cycles table
\i database/08_create_billing_cycles.sql

-- Step 5: Create subscription changes table
\i database/09_create_subscription_changes.sql

-- =====================================================
-- VERIFICATION
-- =====================================================

-- Verify all tables exist
SELECT 
    table_name,
    (SELECT COUNT(*) FROM information_schema.columns 
     WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public'
AND table_name IN (
    'country_plan_prices',
    'payment_transactions',
    'billing_cycles',
    'subscription_changes'
)
ORDER BY table_name;

-- Verify country plan prices
SELECT 
    country,
    plan_tier,
    price_inr,
    payment_gateway,
    is_active
FROM country_plan_prices
ORDER BY country, 
    CASE plan_tier 
        WHEN 'free' THEN 1 
        WHEN 'basic' THEN 2 
        WHEN 'premium' THEN 3 
    END;

-- Verify user_subscriptions columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'user_subscriptions' 
AND column_name IN (
    'locked_amount_inr',
    'country',
    'payment_gateway',
    'autopay_enabled',
    'razorpay_mandate_id',
    'next_billing_date',
    'billing_cycle_count'
)
ORDER BY column_name;

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '✅ All payment system tables created successfully!';
    RAISE NOTICE '📊 Tables created: country_plan_prices, payment_transactions, billing_cycles, subscription_changes';
    RAISE NOTICE '🔄 Table updated: user_subscriptions (enhanced with payment columns)';
    RAISE NOTICE '💰 Country prices: India, United States, United Kingdom (with example prices)';
END $$;
