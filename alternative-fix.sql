-- Alternative fix: Create new subscription for current user
-- This copies the existing subscription to the correct user ID

INSERT INTO user_subscriptions (
  user_id,
  plan_id,
  status,
  current_period_start,
  current_period_end,
  startup_count,
  amount,
  interval,
  is_in_trial,
  trial_start,
  trial_end,
  razorpay_subscription_id,
  billing_interval
) 
SELECT 
  '3d6fa11c-562d-4b35-abe4-703208a9b422' as user_id,  -- Current user ID
  plan_id,
  status,
  current_period_start,
  current_period_end,
  startup_count,
  amount,
  interval,
  is_in_trial,
  trial_start,
  trial_end,
  razorpay_subscription_id,
  billing_interval
FROM user_subscriptions 
WHERE user_id = '88e3b037-4bf9-4e79-91ac-ed3cc2746b88';

-- Verify the new subscription
SELECT * FROM user_subscriptions 
WHERE user_id = '3d6fa11c-562d-4b35-abe4-703208a9b422';

