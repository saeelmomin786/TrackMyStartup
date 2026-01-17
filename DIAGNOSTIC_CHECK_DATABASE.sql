-- 🔍 DIAGNOSTIC: Check Current Database State Before Fix
-- Run this in Supabase SQL Editor to verify current setup
-- This is READ-ONLY - no modifications

-- =====================================================
-- SECTION 1: Check Current RLS Policies
-- =====================================================
-- ✅ SECTION 1: Current RLS Policies on user_subscriptions

SELECT 
    '1️⃣ RLS POLICIES' as section,
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'user_subscriptions'
ORDER BY policyname;

-- =====================================================
-- SECTION 2: Check Advisor Credits Data
-- =====================================================
-- ✅ SECTION 2: Advisor Credits Balance (First 10 Advisors)

SELECT 
    '2️⃣ CREDITS' as section,
    advisor_user_id,
    credits_available,
    credits_used,
    credits_purchased,
    created_at,
    updated_at
FROM advisor_credits
LIMIT 10;

-- =====================================================
-- SECTION 3: Check for Negative Credits (BUG CHECK!)
-- =====================================================
-- ✅ SECTION 3: ⚠️ CHECK FOR NEGATIVE CREDITS (Bug Indicator)

SELECT 
    '3️⃣ NEGATIVE CREDITS CHECK' as section,
    COUNT(*) as advisors_with_negative_credits,
    MIN(credits_available) as min_balance,
    MAX(credits_available) as max_balance,
    CASE 
        WHEN COUNT(*) > 0 THEN '🚨 BUG ACTIVE!'
        ELSE '✅ OK'
    END as status
FROM advisor_credits
WHERE credits_available < 0;

-- Show which advisors have negative
SELECT 
    '3️⃣ NEGATIVE DETAILS' as section,
    advisor_user_id,
    credits_available,
    credits_used,
    credits_purchased,
    (credits_purchased - credits_used) as expected_balance
FROM advisor_credits
WHERE credits_available < 0;

-- =====================================================
-- SECTION 4: Check Active Assignments
-- =====================================================
-- ✅ SECTION 4: Active Credit Assignments

SELECT 
    '4️⃣ ASSIGNMENTS SUMMARY' as section,
    COUNT(*) as total_active_assignments,
    COUNT(CASE WHEN auto_renewal_enabled THEN 1 END) as with_auto_renewal,
    COUNT(CASE WHEN auto_renewal_enabled = false THEN 1 END) as without_auto_renewal
FROM advisor_credit_assignments
WHERE status = 'active';

-- Show first 10 assignments
SELECT 
    '4️⃣ ACTIVE ASSIGNMENTS' as section,
    id,
    advisor_user_id,
    startup_user_id,
    start_date,
    end_date,
    auto_renewal_enabled,
    status,
    assigned_at
FROM advisor_credit_assignments
WHERE status = 'active'
LIMIT 10;

-- =====================================================
-- SECTION 5: Check User Subscriptions (Premium)
-- =====================================================
-- ✅ SECTION 5: Active Premium Subscriptions

SELECT 
    '5️⃣ PREMIUM SUMMARY' as section,
    COUNT(*) as total_premium_subscriptions,
    COUNT(CASE WHEN paid_by_advisor_id IS NOT NULL THEN 1 END) as advisor_paid,
    COUNT(CASE WHEN paid_by_advisor_id IS NULL THEN 1 END) as self_paid
FROM user_subscriptions
WHERE plan_tier = 'premium' AND status = 'active';

-- Show first 10 premium subscriptions
SELECT 
    '5️⃣ ACTIVE PREMIUM' as section,
    id,
    user_id,
    plan_tier,
    status,
    paid_by_advisor_id,
    current_period_start,
    current_period_end,
    created_at
FROM user_subscriptions
WHERE plan_tier = 'premium' AND status = 'active'
LIMIT 10;

-- =====================================================
-- SECTION 6: Credit Purchase History
-- =====================================================
-- ✅ SECTION 6: Recent Credit Purchases (Last 20)

SELECT 
    '6️⃣ PURCHASES' as section,
    advisor_user_id,
    credits_purchased,
    amount_paid,
    currency,
    payment_gateway,
    status,
    purchased_at
FROM credit_purchase_history
ORDER BY purchased_at DESC
LIMIT 20;

-- =====================================================
-- SECTION 7: Payment Flow Check
-- =====================================================
-- ✅ SECTION 7: Payment Status Summary

SELECT 
    '7️⃣ PAYMENT STATUS' as section,
    payment_gateway,
    status,
    COUNT(*) as count,
    SUM(credits_purchased) as total_credits,
    SUM(amount_paid) as total_amount
FROM credit_purchase_history
GROUP BY payment_gateway, status
ORDER BY payment_gateway, status;

-- =====================================================
-- SECTION 8: Auto-Renewal Status Check
-- =====================================================
-- ✅ SECTION 8: Auto-Renewal Tracking

SELECT 
    '8️⃣ AUTO-RENEWAL STATUS' as section,
    auto_renewal_enabled,
    status,
    COUNT(*) as count,
    MIN(end_date) as earliest_expiry,
    MAX(end_date) as latest_expiry
FROM advisor_credit_assignments
GROUP BY auto_renewal_enabled, status
ORDER BY auto_renewal_enabled DESC, status;

-- =====================================================
-- SECTION 9: Check Expiring Assignments (Next 30 Days)
-- =====================================================
-- ✅ SECTION 9: Assignments Expiring in Next 30 Days

SELECT 
    '9️⃣ EXPIRING SOON' as section,
    id,
    advisor_user_id,
    startup_user_id,
    end_date,
    auto_renewal_enabled,
    (end_date - NOW()) as days_until_expiry,
    status
FROM advisor_credit_assignments
WHERE status = 'active'
  AND end_date BETWEEN NOW() AND NOW() + INTERVAL '30 days'
ORDER BY end_date ASC;

-- =====================================================
-- SECTION 10: Database Constraints Check
-- =====================================================
-- ✅ SECTION 10: Current Database Constraints

SELECT 
    '🔟 CONSTRAINTS' as section,
    constraint_name,
    constraint_type,
    table_name
FROM information_schema.table_constraints
WHERE table_name IN ('advisor_credits', 'user_subscriptions')
ORDER BY table_name, constraint_name;

-- Check for CHECK constraints specifically
SELECT 
    '🔟 CHECK DETAILS' as section,
    constraint_name,
    check_clause
FROM information_schema.check_constraints
WHERE constraint_schema = 'public'
ORDER BY constraint_name;

-- =====================================================
-- SECTION 11: RPC Functions Check
-- =====================================================
-- ✅ SECTION 11: Available RPC Functions

SELECT 
    '1️⃣1️⃣ RPC FUNCTIONS' as section,
    routine_name,
    routine_type,
    routine_schema
FROM information_schema.routines
WHERE routine_name LIKE '%advisor%' OR routine_name LIKE '%credit%'
ORDER BY routine_name;

-- =====================================================
-- SECTION 12: Flow Verification - Sample Advisor
-- =====================================================
-- ✅ SECTION 12: Sample Flow for One Advisor (For Verification)

-- Get one advisor with credits
WITH sample_advisor AS (
    SELECT advisor_user_id
    FROM advisor_credits
    WHERE credits_available > 0
    LIMIT 1
)
SELECT 
    '1️⃣2️⃣ SAMPLE FLOW' as section,
    'Credits' as info_type,
    ac.credits_available::text as value
FROM advisor_credits ac
WHERE ac.advisor_user_id = (SELECT advisor_user_id FROM sample_advisor)
UNION ALL
SELECT 
    '1️⃣2️⃣ SAMPLE FLOW' as section,
    'Active Assignments' as info_type,
    COUNT(*)::text
FROM advisor_credit_assignments aca
WHERE aca.advisor_user_id = (SELECT advisor_user_id FROM sample_advisor)
  AND aca.status = 'active'
UNION ALL
SELECT 
    '1️⃣2️⃣ SAMPLE FLOW' as section,
    'Premium Subscriptions' as info_type,
    COUNT(*)::text
FROM user_subscriptions us
WHERE us.paid_by_advisor_id = (SELECT advisor_user_id FROM sample_advisor)
  AND us.status = 'active';

-- =====================================================
-- SECTION 13: Summary Report
-- =====================================================
-- ✅ SECTION 13: SUMMARY REPORT

DO $$
DECLARE
    neg_credits INT;
    total_advisors INT;
    avg_credits NUMERIC;
    CHECK_constraint_count INT;
    safe_function_exists BOOLEAN;
BEGIN
    -- Count negative credits
    SELECT COUNT(*) INTO neg_credits
    FROM advisor_credits
    WHERE credits_available < 0;
    
    -- Count total advisors
    SELECT COUNT(*) INTO total_advisors
    FROM advisor_credits;
    
    -- Average credits
    SELECT AVG(credits_available) INTO avg_credits
    FROM advisor_credits;
    
    -- Check for constraints
    SELECT COUNT(*) INTO CHECK_constraint_count
    FROM information_schema.check_constraints
    WHERE constraint_schema = 'public'
      AND constraint_name LIKE '%credit%';
    
    -- Check for safe function
    SELECT EXISTS (
        SELECT 1 FROM information_schema.routines
        WHERE routine_name = 'deduct_advisor_credit_safe'
    ) INTO safe_function_exists;
    
    RAISE NOTICE '';
    RAISE NOTICE '╔════════════════════════════════════════════════════════════════╗';
    RAISE NOTICE '║ 📊 DATABASE STATUS REPORT:                                    ║';
    RAISE NOTICE '╠════════════════════════════════════════════════════════════════╣';
    RAISE NOTICE '║ Total Advisors: %', total_advisors;
    RAISE NOTICE '║ Average Credits Per Advisor: %', ROUND(avg_credits, 2);
    RAISE NOTICE '║ Advisors with NEGATIVE Credits: % ⚠️', neg_credits;
    RAISE NOTICE '║                                                                ║';
    RAISE NOTICE '║ 🔒 DATABASE PROTECTION STATUS:                                ║';
    RAISE NOTICE '║ CHECK Constraints on Credits: % %',
        CHECK_constraint_count,
        CASE WHEN CHECK_constraint_count > 0 THEN '✅' ELSE '❌' END;
    RAISE NOTICE '║ Safe Deduction Function: % %',
        safe_function_exists,
        CASE WHEN safe_function_exists THEN '✅' ELSE '❌' END;
    RAISE NOTICE '║                                                                ║';
    RAISE NOTICE '║ 🚀 VERDICT:                                                    ║';
    IF neg_credits > 0 THEN
        RAISE NOTICE '║ ⚠️  YES - % advisor(s) with negative - MUST FIX!', neg_credits;
    ELSIF CHECK_constraint_count = 0 THEN
        RAISE NOTICE '║ ⚠️  YES - No constraints - SHOULD ADD';
    ELSIF safe_function_exists = false THEN
        RAISE NOTICE '║ ⚠️  YES - No safe function - SHOULD ADD';
    ELSE
        RAISE NOTICE '║ ✅ NO - System working correctly!';
    END IF;
    RAISE NOTICE '╚════════════════════════════════════════════════════════════════╝';
    RAISE NOTICE '';
END $$;
