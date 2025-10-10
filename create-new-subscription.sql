-- Create new subscription for current user
-- First, get the plan details from the existing subscription
SELECT sp.* FROM subscription_plans sp 
JOIN user_subscriptions us ON sp.id = us.plan_id 
WHERE us.user_id = '88e3b037-4bf9-4e79-91ac-ed3cc2746b88';

-- Then create new subscription for current user
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
  razorpay_subscription_id
) VALUES (
  '3d6fa11c-562d-4b35-abe4-703208a9b422',  -- Current user ID
  '9efd167b-e225-46e4-8ef1-22c6c70f3a3b',  -- Same plan ID
  'active',
  '2025-10-09 19:38:35.133+00',
  '2025-11-08 19:38:35.134+00',
  0,
  100.00,
  'monthly',
  false,
  'sub_RRUamRQ2MBn7rc'
);

