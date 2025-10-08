-- Final Fix for interval/billing_interval column issue
-- This script handles the existing interval column properly

-- =====================================================
-- STEP 1: CHECK CURRENT TABLE STRUCTURE
-- =====================================================

-- Check what columns exist
SELECT 
    'Current Columns' as info,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'subscription_plans' 
AND column_name IN ('interval', 'billing_interval')
ORDER BY column_name;

-- =====================================================
-- STEP 2: UPDATE EXISTING INTERVAL COLUMN
-- =====================================================

-- Update the existing interval column with proper values
UPDATE subscription_plans 
SET interval = 'monthly' 
WHERE interval IS NULL 
AND user_type = 'Startup';

UPDATE subscription_plans 
SET interval = 'yearly' 
WHERE interval IS NULL 
AND user_type = 'Startup' 
AND name LIKE '%Yearly%';

-- =====================================================
-- STEP 3: INSERT STARTUP PLANS (using existing interval column)
-- =====================================================

-- Insert startup plans using the existing interval column
INSERT INTO subscription_plans (name, price, currency, interval, description, user_type, country, is_active) VALUES
-- Monthly Plans
('Monthly Plan - Startup', 15.00, 'EUR', 'monthly', 'Monthly subscription for startup users - full access to all features', 'Startup', 'Global', true),
('Monthly Plan - Startup (INR)', 1200.00, 'INR', 'monthly', 'Monthly subscription for startup users in INR', 'Startup', 'India', true),
('Monthly Plan - Startup (USD)', 18.00, 'USD', 'monthly', 'Monthly subscription for startup users in USD', 'Startup', 'United States', true),

-- Yearly Plans
('Yearly Plan - Startup', 120.00, 'EUR', 'yearly', 'Yearly subscription for startup users - save 2 months (2 months free)', 'Startup', 'Global', true),
('Yearly Plan - Startup (INR)', 9600.00, 'INR', 'yearly', 'Yearly subscription for startup users in INR - save 2 months', 'Startup', 'India', true),
('Yearly Plan - Startup (USD)', 144.00, 'USD', 'yearly', 'Yearly subscription for startup users in USD - save 2 months', 'Startup', 'United States', true)

-- Handle conflicts - update existing plans if they exist
ON CONFLICT (name, user_type, interval, country) 
DO UPDATE SET
    price = EXCLUDED.price,
    currency = EXCLUDED.currency,
    description = EXCLUDED.description,
    is_active = EXCLUDED.is_active,
    updated_at = NOW();

-- =====================================================
-- STEP 4: ADD BILLING_INTERVAL COLUMN FOR FUTURE USE
-- =====================================================

-- Add billing_interval column for future compatibility
ALTER TABLE subscription_plans 
ADD COLUMN IF NOT EXISTS billing_interval VARCHAR(20);

-- Copy data from interval to billing_interval
UPDATE subscription_plans 
SET billing_interval = interval 
WHERE billing_interval IS NULL;

-- =====================================================
-- STEP 5: UPDATE USER_SUBSCRIPTIONS TABLE
-- =====================================================

-- Add billing_interval column to user_subscriptions
ALTER TABLE user_subscriptions 
ADD COLUMN IF NOT EXISTS billing_interval VARCHAR(20);

-- Copy data from interval to billing_interval in user_subscriptions
UPDATE user_subscriptions 
SET billing_interval = interval 
WHERE billing_interval IS NULL 
AND interval IS NOT NULL;

-- =====================================================
-- STEP 6: CREATE INDEXES
-- =====================================================

-- Create indexes for both interval and billing_interval
CREATE INDEX IF NOT EXISTS idx_subscription_plans_interval ON subscription_plans(interval);
CREATE INDEX IF NOT EXISTS idx_subscription_plans_billing_interval ON subscription_plans(billing_interval);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_interval ON user_subscriptions(interval);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_billing_interval ON user_subscriptions(billing_interval);

-- =====================================================
-- STEP 7: CREATE HELPFUL VIEWS
-- =====================================================

-- View for active startup subscription plans
CREATE OR REPLACE VIEW active_startup_plans AS
SELECT 
    id,
    name,
    price,
    currency,
    interval,
    billing_interval,
    description,
    country,
    CASE 
        WHEN interval = 'yearly' OR billing_interval = 'yearly' THEN 'Best Value - Save 2 months!'
        ELSE 'Flexible monthly billing'
    END as plan_benefit,
    CASE 
        WHEN interval = 'yearly' OR billing_interval = 'yearly' THEN ROUND(price / 12, 2)
        ELSE price
    END as monthly_equivalent
FROM subscription_plans 
WHERE user_type = 'Startup' 
AND is_active = true
ORDER BY COALESCE(interval, billing_interval), price;

-- =====================================================
-- STEP 8: VERIFY THE FIX
-- =====================================================

-- Check if plans were created successfully
SELECT 
    'Startup Plans Check' as check_type,
    COUNT(*) as total_plans,
    COUNT(CASE WHEN interval = 'monthly' THEN 1 END) as monthly_plans,
    COUNT(CASE WHEN interval = 'yearly' THEN 1 END) as yearly_plans
FROM subscription_plans 
WHERE user_type = 'Startup' AND is_active = true;

-- Show the plans
SELECT 
    'Created Plans' as info,
    name,
    price,
    currency,
    interval,
    billing_interval,
    country
FROM subscription_plans 
WHERE user_type = 'Startup' AND is_active = true
ORDER BY interval, price;






