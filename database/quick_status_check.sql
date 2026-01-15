-- =====================================================
-- QUICK STATUS CHECK - Run this first
-- =====================================================

-- Quick check: Function exists and has permissions?
SELECT 
    '✅ Function Status' as status,
    CASE 
        WHEN COUNT(*) > 0 THEN 'EXISTS'
        ELSE '❌ MISSING'
    END as function_exists,
    CASE 
        WHEN MAX(prosecdef) = true THEN '✅ SECURITY DEFINER'
        ELSE '❌ NOT SECURITY DEFINER'
    END as security_definer,
    CASE 
        WHEN has_function_privilege('authenticated', oid, 'EXECUTE') THEN '✅ HAS PERMISSIONS'
        ELSE '❌ NO PERMISSIONS'
    END as permissions
FROM pg_proc 
WHERE proname = 'increment_advisor_credits'
AND pronamespace = 'public'::regnamespace;

-- Quick check: Recent failed purchases
SELECT 
    '⚠️ Recent Failed Purchases' as status,
    COUNT(*) as failed_count,
    MAX(purchased_at) as last_failure_time
FROM credit_purchase_history
WHERE status = 'failed'
AND purchased_at >= NOW() - INTERVAL '1 hour';

-- Quick check: Recent successful purchases
SELECT 
    '✅ Recent Successful Purchases' as status,
    COUNT(*) as success_count,
    MAX(purchased_at) as last_success_time
FROM credit_purchase_history
WHERE status = 'completed'
AND purchased_at >= NOW() - INTERVAL '1 hour';

-- Quick check: Check specific payment ID (replace with your payment ID)
SELECT 
    '🔍 Payment ID Check' as status,
    id,
    advisor_user_id,
    credits_purchased,
    amount_paid,
    currency,
    payment_gateway,
    payment_transaction_id,
    status,
    purchased_at,
    metadata->>'error' as error_message
FROM credit_purchase_history
WHERE payment_transaction_id = '0KG655528H624574H'  -- Replace with your payment ID
ORDER BY purchased_at DESC
LIMIT 1;
