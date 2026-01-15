-- =====================================================
-- UPDATE SUBSCRIPTION PLANS TABLE
-- =====================================================

-- Add plan_tier column if it doesn't exist
ALTER TABLE subscription_plans 
ADD COLUMN IF NOT EXISTS plan_tier VARCHAR(20) CHECK (plan_tier IN ('free', 'basic', 'premium'));

-- Add storage_limit_mb column if it doesn't exist
ALTER TABLE subscription_plans 
ADD COLUMN IF NOT EXISTS storage_limit_mb INTEGER DEFAULT 100;

-- Add features JSONB column if it doesn't exist
ALTER TABLE subscription_plans 
ADD COLUMN IF NOT EXISTS features JSONB DEFAULT '{}'::jsonb;

-- Create index for plan_tier
CREATE INDEX IF NOT EXISTS idx_subscription_plans_tier 
ON subscription_plans(plan_tier) 
WHERE is_active = true;

-- =====================================================
-- UPDATE USER SUBSCRIPTIONS TABLE
-- =====================================================

-- Add payment gateway tracking columns
ALTER TABLE user_subscriptions 
ADD COLUMN IF NOT EXISTS payment_gateway VARCHAR(20) CHECK (payment_gateway IN ('razorpay', 'payaid'));

ALTER TABLE user_subscriptions 
ADD COLUMN IF NOT EXISTS gateway_subscription_id TEXT;

ALTER TABLE user_subscriptions 
ADD COLUMN IF NOT EXISTS gateway_customer_id TEXT;

ALTER TABLE user_subscriptions 
ADD COLUMN IF NOT EXISTS country VARCHAR(100);

ALTER TABLE user_subscriptions 
ADD COLUMN IF NOT EXISTS storage_used_mb INTEGER DEFAULT 0;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_gateway 
ON user_subscriptions(payment_gateway) 
WHERE payment_gateway IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_user_subscriptions_country 
ON user_subscriptions(country) 
WHERE country IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_user_subscriptions_gateway_subscription_id 
ON user_subscriptions(gateway_subscription_id) 
WHERE gateway_subscription_id IS NOT NULL;

-- =====================================================
-- CREATE FUNCTION TO GET USER PLAN TIER
-- =====================================================

CREATE OR REPLACE FUNCTION get_user_plan_tier(p_user_id UUID)
RETURNS VARCHAR(20) AS $$
DECLARE
    v_plan_tier VARCHAR(20);
BEGIN
    SELECT sp.plan_tier INTO v_plan_tier
    FROM user_subscriptions us
    JOIN subscription_plans sp ON us.plan_id = sp.id
    WHERE us.user_id = p_user_id
    AND us.status = 'active'
    ORDER BY us.current_period_start DESC
    LIMIT 1;
    
    RETURN COALESCE(v_plan_tier, 'free');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- CREATE FUNCTION TO CHECK FEATURE ACCESS
-- =====================================================

CREATE OR REPLACE FUNCTION can_user_access_feature(
    p_user_id UUID,
    p_feature_name VARCHAR(100)
)
RETURNS BOOLEAN AS $$
DECLARE
    v_plan_tier VARCHAR(20);
    v_is_enabled BOOLEAN;
BEGIN
    -- Get user's plan tier
    v_plan_tier := get_user_plan_tier(p_user_id);
    
    -- Check if feature is enabled for this plan tier
    SELECT is_enabled INTO v_is_enabled
    FROM plan_features
    WHERE plan_tier = v_plan_tier
    AND feature_name = p_feature_name;
    
    RETURN COALESCE(v_is_enabled, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- CREATE FUNCTION TO GET USER STORAGE LIMIT
-- =====================================================

CREATE OR REPLACE FUNCTION get_user_storage_limit(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
    v_storage_limit INTEGER;
BEGIN
    SELECT sp.storage_limit_mb INTO v_storage_limit
    FROM user_subscriptions us
    JOIN subscription_plans sp ON us.plan_id = sp.id
    WHERE us.user_id = p_user_id
    AND us.status = 'active'
    ORDER BY us.current_period_start DESC
    LIMIT 1;
    
    RETURN COALESCE(v_storage_limit, 100); -- Default to 100 MB
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================

GRANT EXECUTE ON FUNCTION get_user_plan_tier(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION can_user_access_feature(UUID, VARCHAR) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_storage_limit(UUID) TO authenticated;

-- =====================================================
-- VERIFY UPDATES
-- =====================================================

-- Check subscription_plans columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'subscription_plans' 
AND column_name IN ('plan_tier', 'storage_limit_mb', 'features')
ORDER BY column_name;

-- Check user_subscriptions columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'user_subscriptions' 
AND column_name IN ('payment_gateway', 'gateway_subscription_id', 'gateway_customer_id', 'country', 'storage_used_mb')
ORDER BY column_name;
