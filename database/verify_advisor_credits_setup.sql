-- =====================================================
-- VERIFICATION QUERIES FOR ADVISOR CREDITS SYSTEM
-- =====================================================
-- Run these queries to verify everything is set up correctly
-- =====================================================

-- =====================================================
-- 1. CHECK IF FUNCTION EXISTS AND OWNER
-- =====================================================
SELECT 
    'Function Exists Check' as check_type,
    proname as function_name,
    pg_get_function_identity_arguments(oid) as arguments,
    prosecdef as is_security_definer,
    proowner::regrole::text as owner,
    CASE 
        WHEN proowner::regrole::text = 'postgres' THEN '✅ CORRECT'
        ELSE '❌ WRONG OWNER - Should be postgres'
    END as owner_status,
    CASE 
        WHEN prosecdef = true THEN '✅ SECURITY DEFINER'
        ELSE '❌ NOT SECURITY DEFINER'
    END as security_definer_status
FROM pg_proc 
WHERE proname = 'increment_advisor_credits'
AND pronamespace = 'public'::regnamespace;

-- Expected: Should return 1 row with:
-- - is_security_definer = true
-- - owner = 'postgres'

-- =====================================================
-- 2. CHECK FUNCTION PERMISSIONS
-- =====================================================
SELECT 
    'Function Permissions Check' as check_type,
    p.proname as function_name,
    r.rolname as role_name,
    has_function_privilege(r.rolname, p.oid, 'EXECUTE') as can_execute
FROM pg_proc p
CROSS JOIN pg_roles r
WHERE p.proname = 'increment_advisor_credits'
AND p.pronamespace = 'public'::regnamespace
AND r.rolname IN ('authenticated', 'anon', 'service_role', 'postgres')
ORDER BY r.rolname;

-- Expected: All roles should have can_execute = true

-- =====================================================
-- 3. CHECK TABLE STRUCTURE
-- =====================================================
SELECT 
    'Table Structure Check' as check_type,
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name IN ('advisor_credits', 'credit_purchase_history', 'advisor_credit_subscriptions')
ORDER BY table_name, ordinal_position;

-- =====================================================
-- 4. CHECK TABLE PERMISSIONS (including postgres)
-- =====================================================
SELECT 
    'Table Permissions Check' as check_type,
    table_schema as schema_name,
    table_name,
    grantee,
    privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
AND table_name IN ('advisor_credits', 'credit_purchase_history')
AND grantee IN ('authenticated', 'anon', 'service_role', 'postgres')
ORDER BY table_name, grantee, privilege_type;

-- =====================================================
-- 5. CHECK IF RLS IS ENABLED (should be disabled or have proper policies)
-- =====================================================
SELECT 
    'RLS Status Check' as check_type,
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('advisor_credits', 'credit_purchase_history', 'advisor_credit_subscriptions')
ORDER BY tablename;

-- =====================================================
-- 6. CHECK EXISTING CREDITS DATA (if any)
-- =====================================================
SELECT 
    'Existing Credits Data' as check_type,
    COUNT(*) as total_records,
    COUNT(DISTINCT advisor_user_id) as unique_advisors,
    SUM(credits_available) as total_credits_available,
    SUM(credits_purchased) as total_credits_purchased
FROM advisor_credits;

-- =====================================================
-- 7. CHECK PURCHASE HISTORY (if any)
-- =====================================================
SELECT 
    'Purchase History Check' as check_type,
    COUNT(*) as total_purchases,
    COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_purchases,
    COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_purchases,
    SUM(CASE WHEN status = 'completed' THEN credits_purchased ELSE 0 END) as total_credits_purchased
FROM credit_purchase_history;

-- =====================================================
-- 8. TEST FUNCTION CALL (with a dummy UUID - will fail but shows if function is callable)
-- =====================================================
-- WARNING: This will try to create a record, use with caution
-- Uncomment to test:
/*
DO $$
DECLARE
    test_user_id UUID := '00000000-0000-0000-0000-000000000000'::UUID;
    test_result advisor_credits;
BEGIN
    SELECT * INTO test_result
    FROM increment_advisor_credits(
        test_user_id,
        1,
        10.00,
        'EUR'
    );
    
    RAISE NOTICE 'Function test successful. Credits available: %', test_result.credits_available;
    
    -- Clean up test record
    DELETE FROM advisor_credits WHERE advisor_user_id = test_user_id;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Function test failed: %', SQLERRM;
END $$;
*/

-- =====================================================
-- 9. CHECK RECENT PURCHASE ATTEMPTS (last 24 hours)
-- =====================================================
SELECT 
    'Recent Purchase Attempts' as check_type,
    id,
    advisor_user_id,
    credits_purchased,
    amount_paid,
    currency,
    payment_gateway,
    status,
    purchased_at,
    metadata
FROM credit_purchase_history
WHERE purchased_at >= NOW() - INTERVAL '24 hours'
ORDER BY purchased_at DESC
LIMIT 10;

-- =====================================================
-- 10. CHECK FOR FAILED PURCHASES WITH PAYMENT ID
-- =====================================================
SELECT 
    'Failed Purchases Check' as check_type,
    id,
    advisor_user_id,
    credits_purchased,
    amount_paid,
    payment_transaction_id,
    status,
    purchased_at,
    metadata->>'error' as error_message,
    metadata->>'error_code' as error_code
FROM credit_purchase_history
WHERE status = 'failed'
AND purchased_at >= NOW() - INTERVAL '24 hours'
ORDER BY purchased_at DESC;

-- =====================================================
-- 11. SUMMARY CHECK
-- =====================================================
SELECT 
    'SUMMARY' as check_type,
    (SELECT COUNT(*) FROM pg_proc WHERE proname = 'increment_advisor_credits') as function_exists,
    (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'advisor_credits') as credits_table_exists,
    (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'credit_purchase_history') as history_table_exists,
    (SELECT COUNT(*) FROM advisor_credits) as total_credit_records,
    (SELECT COUNT(*) FROM credit_purchase_history WHERE status = 'completed') as successful_purchases,
    (SELECT COUNT(*) FROM credit_purchase_history WHERE status = 'failed') as failed_purchases;
