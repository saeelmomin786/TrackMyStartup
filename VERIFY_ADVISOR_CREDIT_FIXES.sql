-- 🔍 ADVISOR CREDIT SYSTEM - VERIFICATION QUERIES
-- Run these queries to verify the fixes are working correctly

-- =====================================================
-- 1. CHECK ADVISOR CREDITS AFTER SUBSCRIPTION
-- =====================================================
-- Replace 'YOUR_ADVISOR_AUTH_USER_ID' with your actual advisor auth user ID

SELECT 
  '1. Advisor Credits' as section,
  ac.credits_available,
  ac.credits_used,
  ac.total_credits_purchased,
  ac.created_at,
  ac.updated_at
FROM advisor_credits ac
WHERE ac.advisor_user_id = 'YOUR_ADVISOR_AUTH_USER_ID';

-- Expected Results AFTER FIX:
-- credits_available: Should match credits_per_month (e.g., 5)
-- total_credits_purchased: Should match credits_per_month
-- credits_used: 0 (or 1+ if assigned to startups)


-- =====================================================
-- 2. CHECK ADVISOR CREDIT SUBSCRIPTION
-- =====================================================

SELECT 
  '2. Credit Subscription' as section,
  acs.id,
  acs.status,
  acs.credits_per_month,
  acs.billing_cycle_count,  -- Should be 1 (not 0!) after fix
  acs.total_paid,  -- Should be > 0 after fix
  acs.current_period_start,
  acs.current_period_end,
  acs.last_billing_date,
  acs.razorpay_subscription_id,
  acs.paypal_subscription_id,
  acs.created_at,
  acs.updated_at
FROM advisor_credit_subscriptions acs
WHERE acs.advisor_user_id = 'YOUR_ADVISOR_AUTH_USER_ID'
ORDER BY acs.created_at DESC
LIMIT 1;

-- Expected Results AFTER FIX:
-- billing_cycle_count: 1 (NOT 0!)
-- total_paid: Should equal plan price (e.g., 299)
-- last_billing_date: Should be recent timestamp


-- =====================================================
-- 3. CHECK CREDIT PURCHASE HISTORY
-- =====================================================

SELECT 
  '3. Purchase History' as section,
  cph.id,
  cph.credits_added,
  cph.amount_paid,
  cph.currency,
  cph.payment_gateway,
  cph.payment_transaction_id,
  cph.purchase_type,
  cph.status,
  cph.created_at
FROM credit_purchase_history cph
WHERE cph.advisor_user_id = 'YOUR_ADVISOR_AUTH_USER_ID'
ORDER BY cph.created_at DESC;

-- Expected Results AFTER FIX:
-- Should have at least 1 record immediately after subscription
-- credits_added: Should match credits_per_month
-- amount_paid: Should match plan price
-- status: 'completed'
-- payment_transaction_id: Should be unique (not null)


-- =====================================================
-- 4. CHECK IF STARTUP ASSIGNED (IF TOGGLED)
-- =====================================================

SELECT 
  '4. Startup Assignments' as section,
  aca.id,
  aca.startup_user_id,
  aca.credits_assigned,
  aca.assignment_date,
  aca.subscription_id,
  us.user_id as startup_profile_id,
  us.plan_id,
  us.status as subscription_status,
  us.start_date,
  us.end_date,
  up.company_name
FROM advisor_credit_assignments aca
JOIN user_subscriptions us ON us.id = aca.subscription_id
JOIN user_profiles up ON up.id = us.user_id
WHERE aca.advisor_user_id = 'YOUR_ADVISOR_AUTH_USER_ID'
AND us.status = 'active'
ORDER BY aca.assignment_date DESC;

-- Expected Results AFTER FIX (if startup toggled):
-- credits_assigned: 1
-- subscription_status: 'active'
-- startup_profile_id: Should be valid UUID
-- company_name: Should show startup name


-- =====================================================
-- 5. FULL SUMMARY VIEW
-- =====================================================

SELECT 
  '5. Full Summary' as section,
  ac.credits_available as "Available Credits",
  ac.credits_used as "Used Credits",
  ac.total_credits_purchased as "Total Purchased",
  acs.billing_cycle_count as "Billing Cycles",
  acs.total_paid as "Total Paid (₹/$/€)",
  acs.credits_per_month as "Credits Per Month",
  acs.status as "Subscription Status",
  (SELECT COUNT(*) FROM advisor_credit_assignments WHERE advisor_user_id = ac.advisor_user_id) as "Startups Assigned",
  (SELECT COUNT(*) FROM credit_purchase_history WHERE advisor_user_id = ac.advisor_user_id) as "Total Purchases"
FROM advisor_credits ac
LEFT JOIN advisor_credit_subscriptions acs ON acs.advisor_user_id = ac.advisor_user_id AND acs.status = 'active'
WHERE ac.advisor_user_id = 'YOUR_ADVISOR_AUTH_USER_ID';

-- Expected Results AFTER FIX:
-- Available Credits: Should be credits_per_month minus used
-- Billing Cycles: Should be 1 (not 0!)
-- Total Paid: Should be > 0
-- Subscription Status: 'active'


-- =====================================================
-- 6. CHECK FOR DUPLICATE CREDITS (IDEMPOTENCY TEST)
-- =====================================================

SELECT 
  '6. Duplicate Check' as section,
  cph.payment_transaction_id,
  COUNT(*) as record_count,
  SUM(cph.credits_added) as total_credits_added,
  STRING_AGG(cph.id::text, ', ') as history_ids
FROM credit_purchase_history cph
WHERE cph.advisor_user_id = 'YOUR_ADVISOR_AUTH_USER_ID'
GROUP BY cph.payment_transaction_id
HAVING COUNT(*) > 1;

-- Expected Results AFTER FIX:
-- Should return NO ROWS (no duplicates!)
-- If it returns rows, idempotency check failed


-- =====================================================
-- 7. TIMELINE OF EVENTS
-- =====================================================

WITH timeline AS (
  SELECT 
    'Subscription Created' as event,
    acs.created_at as event_time,
    CONCAT('billing_cycle: ', acs.billing_cycle_count, ', total_paid: ', acs.total_paid) as details
  FROM advisor_credit_subscriptions acs
  WHERE acs.advisor_user_id = 'YOUR_ADVISOR_AUTH_USER_ID'
  
  UNION ALL
  
  SELECT 
    'Credits Added' as event,
    cph.created_at as event_time,
    CONCAT('credits: ', cph.credits_added, ', amount: ', cph.amount_paid, ' ', cph.currency) as details
  FROM credit_purchase_history cph
  WHERE cph.advisor_user_id = 'YOUR_ADVISOR_AUTH_USER_ID'
  
  UNION ALL
  
  SELECT 
    'Startup Assigned' as event,
    aca.assignment_date as event_time,
    CONCAT('credits: ', aca.credits_assigned, ', subscription: ', aca.subscription_id) as details
  FROM advisor_credit_assignments aca
  WHERE aca.advisor_user_id = 'YOUR_ADVISOR_AUTH_USER_ID'
)
SELECT 
  '7. Timeline' as section,
  event,
  event_time,
  details,
  EXTRACT(EPOCH FROM (event_time - LAG(event_time) OVER (ORDER BY event_time))) as seconds_since_previous
FROM timeline
ORDER BY event_time;

-- Expected Results AFTER FIX:
-- Subscription Created → Credits Added should be very quick (< 5 seconds)
-- This proves credits added immediately, not waiting for webhook


-- =====================================================
-- 8. DIAGNOSTIC: CHECK IF WAITING FOR WEBHOOK
-- =====================================================

SELECT 
  '8. Webhook Status' as section,
  CASE 
    WHEN acs.billing_cycle_count = 0 THEN '⚠️ WAITING FOR WEBHOOK - Credits Not Added Yet'
    WHEN acs.billing_cycle_count = 1 AND acs.total_paid > 0 THEN '✅ IMMEDIATE CREDITS - Fix Working!'
    WHEN acs.billing_cycle_count > 1 THEN '✅ RENEWAL PROCESSED - Webhook Working'
    ELSE '❓ UNKNOWN STATE'
  END as status,
  acs.billing_cycle_count,
  acs.total_paid,
  acs.last_billing_date,
  ac.credits_available,
  CASE 
    WHEN ac.credits_available = 0 AND acs.billing_cycle_count = 0 THEN 'ISSUE: No credits despite subscription'
    WHEN ac.credits_available > 0 AND acs.billing_cycle_count = 1 THEN 'SUCCESS: Immediate credits working'
    WHEN ac.credits_available > 0 AND acs.billing_cycle_count > 1 THEN 'SUCCESS: Webhook renewals working'
    ELSE 'Unknown'
  END as diagnosis
FROM advisor_credit_subscriptions acs
LEFT JOIN advisor_credits ac ON ac.advisor_user_id = acs.advisor_user_id
WHERE acs.advisor_user_id = 'YOUR_ADVISOR_AUTH_USER_ID'
AND acs.status = 'active'
ORDER BY acs.created_at DESC
LIMIT 1;

-- Expected Results AFTER FIX:
-- status: '✅ IMMEDIATE CREDITS - Fix Working!'
-- billing_cycle_count: 1
-- total_paid: > 0
-- credits_available: > 0
-- diagnosis: 'SUCCESS: Immediate credits working'


-- =====================================================
-- TROUBLESHOOTING QUERIES
-- =====================================================

-- If credits still not appearing, run these:

-- Check if advisor_credits record exists:
SELECT * FROM advisor_credits WHERE advisor_user_id = 'YOUR_ADVISOR_AUTH_USER_ID';

-- Check if increment_advisor_credits function exists:
SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_name LIKE '%credit%';

-- Check recent errors in logs (if you have logging table):
-- SELECT * FROM error_logs WHERE user_id = 'YOUR_ADVISOR_AUTH_USER_ID' ORDER BY created_at DESC LIMIT 10;


-- =====================================================
-- BEFORE vs AFTER COMPARISON
-- =====================================================

-- BEFORE FIX:
-- billing_cycle_count: 0
-- total_paid: 0
-- credits_available: 0
-- Timeline: Subscription Created → LONG WAIT → Credits Added (when webhook fires)

-- AFTER FIX:
-- billing_cycle_count: 1
-- total_paid: plan_price
-- credits_available: credits_per_month
-- Timeline: Subscription Created → Credits Added (within seconds)

