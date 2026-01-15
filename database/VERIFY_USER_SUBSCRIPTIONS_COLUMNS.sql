-- =====================================================
-- VERIFY ALL PAYMENT-RELATED COLUMNS IN user_subscriptions
-- =====================================================
-- Run this to check if all columns were added correctly

-- Check all payment-related columns
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'user_subscriptions' 
AND (
    column_name LIKE '%payment%' 
    OR column_name LIKE '%autopay%' 
    OR column_name LIKE '%billing%'
    OR column_name LIKE '%mandate%'
    OR column_name LIKE '%country%'
    OR column_name LIKE '%locked%'
    OR column_name LIKE '%storage%'
    OR column_name LIKE '%previous%'
    OR column_name LIKE '%change%'
    OR column_name LIKE '%total_paid%'
)
ORDER BY 
    CASE 
        WHEN column_name LIKE 'locked%' THEN 1
        WHEN column_name LIKE 'country%' THEN 2
        WHEN column_name LIKE 'payment_gateway%' THEN 3
        WHEN column_name LIKE 'autopay%' THEN 4
        WHEN column_name LIKE '%mandate%' THEN 5
        WHEN column_name LIKE 'next_billing%' THEN 6
        WHEN column_name LIKE 'last_billing%' THEN 7
        WHEN column_name LIKE 'billing_cycle%' THEN 8
        WHEN column_name LIKE 'total_paid%' THEN 9
        WHEN column_name LIKE 'previous%' THEN 10
        WHEN column_name LIKE 'change%' THEN 11
        WHEN column_name LIKE 'storage%' THEN 12
        ELSE 99
    END,
    column_name;

-- =====================================================
-- EXPECTED COLUMNS CHECKLIST
-- =====================================================
-- Payment & Country:
-- ✓ locked_amount_inr (numeric)
-- ✓ country (character varying)
-- ✓ payment_gateway (character varying)

-- Autopay:
-- ✓ autopay_enabled (boolean)
-- ✓ razorpay_mandate_id (text)
-- ✓ payaid_subscription_id (text)
-- ✓ mandate_status (character varying)
-- ✓ mandate_created_at (timestamp with time zone)

-- Billing:
-- ✓ next_billing_date (timestamp with time zone)
-- ✓ last_billing_date (timestamp with time zone)
-- ✓ billing_cycle_count (integer)
-- ✓ total_paid (numeric)

-- Plan Changes:
-- ✓ previous_plan_tier (character varying)
-- ✓ previous_subscription_id (uuid)
-- ✓ change_reason (text)

-- Storage:
-- ✓ storage_used_mb (numeric)

-- =====================================================
-- QUICK COUNT CHECK
-- =====================================================

SELECT 
    COUNT(*) as total_payment_columns,
    COUNT(*) FILTER (WHERE column_name IN (
        'locked_amount_inr', 'country', 'payment_gateway',
        'autopay_enabled', 'razorpay_mandate_id', 'payaid_subscription_id',
        'mandate_status', 'mandate_created_at',
        'next_billing_date', 'last_billing_date', 'billing_cycle_count', 'total_paid',
        'previous_plan_tier', 'previous_subscription_id', 'change_reason',
        'storage_used_mb'
    )) as expected_columns_found
FROM information_schema.columns 
WHERE table_name = 'user_subscriptions';
