-- Startup Subscription Plans Database Schema (FIXED)
-- This file contains the database setup for monthly and yearly startup subscription plans
-- Fixed: Changed 'interval' to 'billing_interval' to avoid PostgreSQL reserved keyword conflict

-- =====================================================
-- STEP 1: ENSURE SUBSCRIPTION PLANS TABLE EXISTS
-- =====================================================

-- Create subscription_plans table if it doesn't exist
CREATE TABLE IF NOT EXISTS subscription_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'EUR',
    billing_interval VARCHAR(20) NOT NULL CHECK (billing_interval IN ('monthly', 'yearly')),
    description TEXT,
    user_type VARCHAR(50) NOT NULL CHECK (user_type IN ('Investor', 'Startup', 'Startup Facilitation Center', 'Investment Advisor')),
    country VARCHAR(100) DEFAULT 'Global',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- STEP 2: INSERT STARTUP SUBSCRIPTION PLANS
-- =====================================================

-- Insert monthly and yearly plans for Startup users
INSERT INTO subscription_plans (name, price, currency, billing_interval, description, user_type, country, is_active) VALUES
-- Monthly Plans
('Monthly Plan - Startup', 15.00, 'EUR', 'monthly', 'Monthly subscription for startup users - full access to all features', 'Startup', 'Global', true),
('Monthly Plan - Startup (INR)', 1200.00, 'INR', 'monthly', 'Monthly subscription for startup users in INR', 'Startup', 'India', true),
('Monthly Plan - Startup (USD)', 18.00, 'USD', 'monthly', 'Monthly subscription for startup users in USD', 'Startup', 'United States', true),

-- Yearly Plans
('Yearly Plan - Startup', 120.00, 'EUR', 'yearly', 'Yearly subscription for startup users - save 2 months (2 months free)', 'Startup', 'Global', true),
('Yearly Plan - Startup (INR)', 9600.00, 'INR', 'yearly', 'Yearly subscription for startup users in INR - save 2 months', 'Startup', 'India', true),
('Yearly Plan - Startup (USD)', 144.00, 'USD', 'yearly', 'Yearly subscription for startup users in USD - save 2 months', 'Startup', 'United States', true)

-- Handle conflicts - update existing plans if they exist
ON CONFLICT (name, user_type, billing_interval, country) 
DO UPDATE SET
    price = EXCLUDED.price,
    currency = EXCLUDED.currency,
    description = EXCLUDED.description,
    is_active = EXCLUDED.is_active,
    updated_at = NOW();

-- =====================================================
-- STEP 3: ENSURE USER_SUBSCRIPTIONS TABLE HAS TRIAL COLUMNS
-- =====================================================

-- Create user_subscriptions table if it doesn't exist
CREATE TABLE IF NOT EXISTS user_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES subscription_plans(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'cancelled', 'past_due')),
    current_period_start TIMESTAMP WITH TIME ZONE NOT NULL,
    current_period_end TIMESTAMP WITH TIME ZONE NOT NULL,
    startup_count INTEGER DEFAULT 0,
    amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    billing_interval VARCHAR(20) NOT NULL CHECK (billing_interval IN ('monthly', 'yearly')),
    
    -- Trial support columns
    is_in_trial BOOLEAN DEFAULT false,
    trial_start TIMESTAMP WITH TIME ZONE,
    trial_end TIMESTAMP WITH TIME ZONE,
    
    -- Payment gateway linkage
    razorpay_subscription_id TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(user_id, plan_id)
);

-- Add trial columns if they don't exist
ALTER TABLE user_subscriptions 
ADD COLUMN IF NOT EXISTS is_in_trial BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS trial_start TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS trial_end TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS razorpay_subscription_id TEXT;

-- =====================================================
-- STEP 4: CREATE INDEXES FOR PERFORMANCE
-- =====================================================

-- Indexes for subscription_plans
CREATE INDEX IF NOT EXISTS idx_subscription_plans_user_type ON subscription_plans(user_type);
CREATE INDEX IF NOT EXISTS idx_subscription_plans_billing_interval ON subscription_plans(billing_interval);
CREATE INDEX IF NOT EXISTS idx_subscription_plans_active ON subscription_plans(is_active);
CREATE INDEX IF NOT EXISTS idx_subscription_plans_country ON subscription_plans(country);

-- Indexes for user_subscriptions
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_status ON user_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_plan_id ON user_subscriptions(plan_id);

-- Trial-specific indexes
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_trial 
ON user_subscriptions(user_id, is_in_trial, status) 
WHERE is_in_trial = true AND status = 'active';

CREATE INDEX IF NOT EXISTS idx_user_subscriptions_trial_end 
ON user_subscriptions(trial_end) 
WHERE is_in_trial = true;

CREATE INDEX IF NOT EXISTS idx_user_subscriptions_razorpay_id 
ON user_subscriptions(razorpay_subscription_id) 
WHERE razorpay_subscription_id IS NOT NULL;

-- =====================================================
-- STEP 5: CREATE HELPFUL VIEWS
-- =====================================================

-- View for active startup subscription plans
CREATE OR REPLACE VIEW active_startup_plans AS
SELECT 
    id,
    name,
    price,
    currency,
    billing_interval,
    description,
    country,
    CASE 
        WHEN billing_interval = 'yearly' THEN 'Best Value - Save 2 months!'
        ELSE 'Flexible monthly billing'
    END as plan_benefit,
    CASE 
        WHEN billing_interval = 'yearly' THEN ROUND(price / 12, 2)
        ELSE price
    END as monthly_equivalent
FROM subscription_plans 
WHERE user_type = 'Startup' 
AND is_active = true
ORDER BY billing_interval, price;

-- View for trial subscriptions
CREATE OR REPLACE VIEW active_trial_subscriptions AS
SELECT 
    us.id,
    us.user_id,
    us.plan_id,
    us.startup_count,
    us.trial_start,
    us.trial_end,
    us.razorpay_subscription_id,
    sp.name as plan_name,
    sp.price as plan_price,
    sp.billing_interval as plan_interval,
    sp.currency as plan_currency,
    EXTRACT(DAY FROM (us.trial_end - NOW())) as days_remaining,
    CASE 
        WHEN us.trial_end <= NOW() THEN 'expired'
        WHEN us.trial_end <= NOW() + INTERVAL '1 day' THEN 'ending_soon'
        ELSE 'active'
    END as trial_status
FROM user_subscriptions us
JOIN subscription_plans sp ON us.plan_id = sp.id
WHERE us.status = 'active' 
AND us.is_in_trial = true
AND us.trial_end > NOW();

-- =====================================================
-- STEP 6: CREATE HELPER FUNCTIONS
-- =====================================================

-- Function to get startup subscription plans
CREATE OR REPLACE FUNCTION get_startup_plans(country_code VARCHAR DEFAULT 'Global')
RETURNS TABLE (
    id UUID,
    name VARCHAR,
    price DECIMAL,
    currency VARCHAR,
    billing_interval VARCHAR,
    description TEXT,
    plan_benefit TEXT,
    monthly_equivalent DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        sp.id,
        sp.name,
        sp.price,
        sp.currency,
        sp.billing_interval,
        sp.description,
        CASE 
            WHEN sp.billing_interval = 'yearly' THEN 'Best Value - Save 2 months!'
            ELSE 'Flexible monthly billing'
        END as plan_benefit,
        CASE 
            WHEN sp.billing_interval = 'yearly' THEN ROUND(sp.price / 12, 2)
            ELSE sp.price
        END as monthly_equivalent
    FROM subscription_plans sp
    WHERE sp.user_type = 'Startup' 
    AND sp.is_active = true
    AND (sp.country = country_code OR sp.country = 'Global')
    ORDER BY sp.billing_interval, sp.price;
END;
$$ LANGUAGE plpgsql;

-- Function to check if user has active trial
CREATE OR REPLACE FUNCTION has_active_trial(user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM user_subscriptions 
        WHERE user_id = user_uuid 
        AND status = 'active' 
        AND is_in_trial = true 
        AND trial_end > NOW()
    );
END;
$$ LANGUAGE plpgsql;

-- Function to get user's trial subscription
CREATE OR REPLACE FUNCTION get_user_trial_subscription(user_uuid UUID)
RETURNS TABLE (
    subscription_id UUID,
    plan_name VARCHAR,
    plan_price DECIMAL,
    plan_interval VARCHAR,
    plan_currency VARCHAR,
    trial_start TIMESTAMP WITH TIME ZONE,
    trial_end TIMESTAMP WITH TIME ZONE,
    days_remaining INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        us.id as subscription_id,
        sp.name as plan_name,
        sp.price as plan_price,
        sp.billing_interval as plan_interval,
        sp.currency as plan_currency,
        us.trial_start,
        us.trial_end,
        EXTRACT(DAY FROM (us.trial_end - NOW()))::INTEGER as days_remaining
    FROM user_subscriptions us
    JOIN subscription_plans sp ON us.plan_id = sp.id
    WHERE us.user_id = user_uuid
    AND us.status = 'active'
    AND us.is_in_trial = true
    AND us.trial_end > NOW();
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- STEP 7: GRANT PERMISSIONS
-- =====================================================

-- Grant permissions for authenticated users
GRANT SELECT ON subscription_plans TO authenticated;
GRANT SELECT ON active_startup_plans TO authenticated;
GRANT SELECT ON active_trial_subscriptions TO authenticated;

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION get_startup_plans(VARCHAR) TO authenticated;
GRANT EXECUTE ON FUNCTION has_active_trial(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_trial_subscription(UUID) TO authenticated;

-- =====================================================
-- STEP 8: SAMPLE DATA VERIFICATION
-- =====================================================

-- Verify that plans were created successfully
DO $$
DECLARE
    plan_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO plan_count 
    FROM subscription_plans 
    WHERE user_type = 'Startup' AND is_active = true;
    
    IF plan_count >= 2 THEN
        RAISE NOTICE 'SUCCESS: % startup subscription plans created', plan_count;
    ELSE
        RAISE WARNING 'WARNING: Only % startup plans found. Expected at least 2.', plan_count;
    END IF;
END $$;

-- =====================================================
-- STEP 9: USAGE EXAMPLES
-- =====================================================

-- Example: Get all startup plans
-- SELECT * FROM get_startup_plans('Global');

-- Example: Check if user has active trial
-- SELECT has_active_trial('user-uuid-here');

-- Example: Get user's trial subscription details
-- SELECT * FROM get_user_trial_subscription('user-uuid-here');

-- Example: Get active trial subscriptions
-- SELECT * FROM active_trial_subscriptions;






