-- Add PayPal Subscription Support
-- Run this in Supabase SQL editor to enable PayPal subscriptions with autopay

-- 1. Add paypal_subscription_id column if it doesn't exist
ALTER TABLE user_subscriptions 
ADD COLUMN IF NOT EXISTS paypal_subscription_id TEXT;

-- 2. Update payment_gateway constraint to include 'paypal'
-- First, drop the existing constraint if it exists
ALTER TABLE user_subscriptions 
DROP CONSTRAINT IF EXISTS user_subscriptions_payment_gateway_check;

-- Add new constraint with 'paypal' included
ALTER TABLE user_subscriptions 
ADD CONSTRAINT user_subscriptions_payment_gateway_check 
CHECK (payment_gateway IN ('razorpay', 'payaid', 'paypal'));

-- 3. Add PayPal-specific cancellation tracking columns (if not exist)
ALTER TABLE user_subscriptions 
ADD COLUMN IF NOT EXISTS paypal_cancelled BOOLEAN DEFAULT false;

-- 4. Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_paypal_subscription_id 
ON user_subscriptions(paypal_subscription_id) 
WHERE paypal_subscription_id IS NOT NULL;

-- 5. Add comment for documentation
COMMENT ON COLUMN user_subscriptions.paypal_subscription_id IS 'PayPal subscription ID for recurring payments/autopay';
COMMENT ON COLUMN user_subscriptions.paypal_cancelled IS 'Whether PayPal subscription was cancelled';

-- Verify the changes
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'user_subscriptions' 
  AND column_name IN ('paypal_subscription_id', 'paypal_cancelled', 'payment_gateway')
ORDER BY column_name;
