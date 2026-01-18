-- =====================================================
-- FIX INCOMPLETE SUBSCRIPTION - UPDATE WITH RAZORPAY DETAILS
-- =====================================================

-- Step 1: Update the incomplete subscription with payment details
UPDATE user_subscriptions
SET 
  razorpay_subscription_id = 'sub_S5OgGhc0OPpaYx',
  payment_gateway = 'razorpay',
  autopay_enabled = true,
  mandate_status = 'active',
  billing_cycle_count = 1,
  total_paid = 800.00,  -- ⚠️ REPLACE with actual amount from payment
  last_billing_date = NOW(),
  next_billing_date = current_period_end,
  updated_at = NOW()
WHERE id = '42cb5877-a20a-4965-a7ff-a134c92173c5';

-- Step 2: Create payment transaction record
INSERT INTO payment_transactions (
  user_id,
  subscription_id,
  payment_gateway,
  gateway_payment_id,
  gateway_order_id,
  gateway_signature,
  amount,
  currency,
  status,
  payment_type,
  plan_tier,
  is_autopay,
  autopay_mandate_id,
  created_at
) VALUES (
  '09c53edc-b6df-4c12-91c0-5ccf6eacb8d6',  -- auth_user_id from logs
  '42cb5877-a20a-4965-a7ff-a134c92173c5',  -- subscription_id
  'razorpay',
  'pay_S5OgNVJCbLTug6',  -- From error logs
  'sub_S5OgGhc0OPpaYx',  -- Order ID = subscription ID
  'd385def76a6846e168fe514427343731a62e3eaec5771c1c52ae543fe7caa33e',  -- From logs
  800.00,  -- ⚠️ REPLACE with actual amount
  'INR',   -- ⚠️ REPLACE with actual currency
  'success',
  'initial',
  'basic',
  true,
  'sub_S5OgGhc0OPpaYx',
  NOW()
);

-- Step 3: Create billing cycle record
INSERT INTO billing_cycles (
  subscription_id,
  cycle_number,
  period_start,
  period_end,
  amount_charged,
  currency,
  status,
  payment_date,
  created_at
) VALUES (
  '42cb5877-a20a-4965-a7ff-a134c92173c5',
  1,
  '2026-01-18 15:51:03.901+00',
  '2026-02-18 15:51:03.901+00',
  800.00,  -- ⚠️ REPLACE with actual amount
  'INR',   -- ⚠️ REPLACE with actual currency
  'completed',
  NOW(),
  NOW()
);

-- Step 4: Verify everything is correct
SELECT 
  'Subscription Details' as check_type,
  id,
  razorpay_subscription_id,
  payment_gateway,
  autopay_enabled,
  billing_cycle_count,
  total_paid
FROM user_subscriptions
WHERE id = '42cb5877-a20a-4965-a7ff-a134c92173c5';

SELECT 
  'Payment Transaction' as check_type,
  id,
  gateway_payment_id,
  amount,
  status
FROM payment_transactions
WHERE subscription_id = '42cb5877-a20a-4965-a7ff-a134c92173c5';

SELECT 
  'Billing Cycle' as check_type,
  id,
  cycle_number,
  amount_charged,
  status
FROM billing_cycles
WHERE subscription_id = '42cb5877-a20a-4965-a7ff-a134c92173c5';

-- =====================================================
-- PERMANENT FIX: Drop the problematic constraint
-- =====================================================

-- This constraint prevents users from re-subscribing to same plan
-- even after cancellation. It's too restrictive.
DROP INDEX IF EXISTS user_subscriptions_user_id_plan_id_key;

-- Verify constraint is dropped
SELECT 
  'Remaining Constraints' as check_type,
  indexname
FROM pg_indexes
WHERE tablename = 'user_subscriptions'
  AND indexname LIKE '%user_id%'
ORDER BY indexname;

-- =====================================================
-- CODE FIX NEEDED: Prevent partial subscription creation
-- =====================================================

/*
The code needs to be updated to:

1. NEVER create subscription without payment details
2. Use UPSERT logic if subscription exists:

// Check if subscription exists
const { data: existingSub } = await supabase
  .from('user_subscriptions')
  .select('id, razorpay_subscription_id')
  .eq('user_id', profileId)
  .eq('plan_id', plan_id)
  .eq('status', 'active')
  .maybeSingle();

if (existingSub) {
  if (!existingSub.razorpay_subscription_id) {
    // Incomplete subscription - UPDATE it
    console.log('[verify] Updating incomplete subscription with payment details');
    await supabase
      .from('user_subscriptions')
      .update({
        razorpay_subscription_id,
        payment_gateway: 'razorpay',
        autopay_enabled: true,
        billing_cycle_count: 1,
        total_paid: amount,
        // ... other fields
      })
      .eq('id', existingSub.id);
  } else {
    // Complete subscription exists - this is duplicate payment
    console.log('[verify] Subscription already complete');
    return { success: true, message: 'Already subscribed' };
  }
}
*/
