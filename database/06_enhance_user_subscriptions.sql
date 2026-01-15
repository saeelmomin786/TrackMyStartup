-- =====================================================
-- ENHANCE USER SUBSCRIPTIONS TABLE
-- =====================================================
-- Add columns for payment gateway, country, locked amounts, and autopay

-- Add locked amount in INR (always INR)
ALTER TABLE user_subscriptions 
ADD COLUMN IF NOT EXISTS locked_amount_inr DECIMAL(10,2);

-- Add country
ALTER TABLE user_subscriptions 
ADD COLUMN IF NOT EXISTS country VARCHAR(100);

-- Add payment gateway
ALTER TABLE user_subscriptions 
ADD COLUMN IF NOT EXISTS payment_gateway VARCHAR(20) CHECK (payment_gateway IN ('razorpay', 'payaid'));

-- Add autopay columns
ALTER TABLE user_subscriptions 
ADD COLUMN IF NOT EXISTS autopay_enabled BOOLEAN DEFAULT false;

ALTER TABLE user_subscriptions 
ADD COLUMN IF NOT EXISTS razorpay_mandate_id TEXT;

ALTER TABLE user_subscriptions 
ADD COLUMN IF NOT EXISTS payaid_subscription_id TEXT;

ALTER TABLE user_subscriptions 
ADD COLUMN IF NOT EXISTS mandate_status VARCHAR(20) CHECK (mandate_status IN ('pending', 'active', 'paused', 'cancelled'));

ALTER TABLE user_subscriptions 
ADD COLUMN IF NOT EXISTS mandate_created_at TIMESTAMP WITH TIME ZONE;

-- Add billing cycle columns
ALTER TABLE user_subscriptions 
ADD COLUMN IF NOT EXISTS next_billing_date TIMESTAMP WITH TIME ZONE;

ALTER TABLE user_subscriptions 
ADD COLUMN IF NOT EXISTS last_billing_date TIMESTAMP WITH TIME ZONE;

ALTER TABLE user_subscriptions 
ADD COLUMN IF NOT EXISTS billing_cycle_count INTEGER DEFAULT 0;

ALTER TABLE user_subscriptions 
ADD COLUMN IF NOT EXISTS total_paid DECIMAL(10,2) DEFAULT 0;

-- Add plan change tracking
ALTER TABLE user_subscriptions 
ADD COLUMN IF NOT EXISTS previous_plan_tier VARCHAR(20);

ALTER TABLE user_subscriptions 
ADD COLUMN IF NOT EXISTS previous_subscription_id UUID;

ALTER TABLE user_subscriptions 
ADD COLUMN IF NOT EXISTS change_reason TEXT;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_country ON user_subscriptions(country) WHERE country IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_gateway ON user_subscriptions(payment_gateway) WHERE payment_gateway IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_mandate ON user_subscriptions(razorpay_mandate_id) WHERE razorpay_mandate_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_next_billing ON user_subscriptions(next_billing_date) WHERE next_billing_date IS NOT NULL;

-- =====================================================
-- VERIFY COLUMNS
-- =====================================================

SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'user_subscriptions' 
AND column_name IN (
    'locked_amount_inr',
    'country',
    'payment_gateway',
    'autopay_enabled',
    'razorpay_mandate_id',
    'mandate_status',
    'next_billing_date',
    'billing_cycle_count'
)
ORDER BY column_name;
