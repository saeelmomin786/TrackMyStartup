-- =====================================================
-- IMMEDIATE FIX: Handle Duplicate Payment Attempt
-- =====================================================

-- SCENARIO: User already has active subscription to the plan they're trying to buy
-- Solution: Check payment_transactions to see if this is a duplicate payment

-- 1️⃣ Check payment transactions for this user
SELECT 
  id,
  gateway_payment_id,
  gateway_order_id,
  amount,
  status,
  payment_type,
  created_at
FROM payment_transactions
WHERE user_id = '09c53edc-b6df-4c12-91c0-5ccf6eacb8d6'  -- auth_user_id from logs
ORDER BY created_at DESC
LIMIT 5;

-- 2️⃣ Check if the Razorpay payment ID from error already exists
SELECT 
  id,
  gateway_payment_id,
  subscription_id,
  amount,
  status,
  created_at
FROM payment_transactions
WHERE gateway_payment_id = 'pay_S5OgNVJCbLTug6'  -- From error logs
LIMIT 1;

-- 3️⃣ If payment already exists, just return success
-- The subscription is already active, no need to create again

-- =====================================================
-- PERMANENT FIX: Update server.js to handle this case
-- =====================================================

-- Add this logic to server.js BEFORE inserting subscription:
/*
// Check if user already has active subscription to this plan
const { data: existingSub } = await supabase
  .from('user_subscriptions')
  .select('id, status, current_period_end')
  .eq('user_id', profileId)
  .eq('plan_id', plan_id)
  .eq('status', 'active')
  .maybeSingle();

if (existingSub) {
  console.log('[verify] ✅ User already has active subscription to this plan');
  
  // Check if this is a duplicate payment attempt
  const { data: existingPayment } = await supabase
    .from('payment_transactions')
    .select('id')
    .eq('gateway_payment_id', razorpay_payment_id)
    .maybeSingle();
  
  if (existingPayment) {
    console.log('[verify] ⚠️ Duplicate payment attempt detected - payment already processed');
    return res.json({
      success: true,
      message: 'Payment already processed',
      subscription: existingSub
    });
  }
  
  // If new payment but subscription exists, extend the period
  console.log('[verify] 💰 Extending existing subscription period...');
  const currentEnd = new Date(existingSub.current_period_end);
  const newEnd = new Date(currentEnd);
  if (interval === 'yearly') {
    newEnd.setFullYear(newEnd.getFullYear() + 1);
  } else {
    newEnd.setMonth(newEnd.getMonth() + 1);
  }
  
  await supabase
    .from('user_subscriptions')
    .update({
      current_period_end: newEnd.toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('id', existingSub.id);
  
  console.log('[verify] ✅ Subscription extended to:', newEnd.toISOString());
  return res.json({
    success: true,
    message: 'Subscription extended',
    subscription: existingSub
  });
}
*/

-- =====================================================
-- IMMEDIATE ACTION FOR THIS USER
-- =====================================================

-- Option A: If payment was NOT charged by Razorpay
-- Just tell user they already have active subscription
-- No action needed

-- Option B: If payment WAS charged by Razorpay (duplicate charge)
-- Extend their subscription period by 1 month/year
UPDATE user_subscriptions
SET 
  current_period_end = current_period_end + INTERVAL '1 month',  -- Change to '1 year' if yearly
  updated_at = NOW()
WHERE id = '42cb5877-a20a-4965-a7ff-a134c92173c5';

-- Verify the update
SELECT 
  id,
  plan_tier,
  status,
  current_period_start,
  current_period_end,
  updated_at
FROM user_subscriptions
WHERE id = '42cb5877-a20a-4965-a7ff-a134c92173c5';

-- =====================================================
-- FRONTEND FIX: Prevent duplicate payments
-- =====================================================

-- Add this check in frontend BEFORE initiating payment:
/*
// Check if user already has active subscription to this plan
const { data: existing } = await supabase
  .from('user_subscriptions')
  .select('id, plan_tier, current_period_end')
  .eq('user_id', profileId)
  .eq('plan_id', planId)
  .eq('status', 'active')
  .maybeSingle();

if (existing) {
  alert('You already have an active subscription to this plan!');
  return;
}
*/
