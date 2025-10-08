-- Simple Fix for billing_interval column issue
-- Run this script to add the missing column and insert the plans

-- =====================================================
-- STEP 1: ADD BILLING_INTERVAL COLUMN
-- =====================================================

-- Add billing_interval column to subscription_plans table
ALTER TABLE subscription_plans 
ADD COLUMN IF NOT EXISTS billing_interval VARCHAR(20);

-- =====================================================
-- STEP 2: ADD BILLING_INTERVAL COLUMN TO USER_SUBSCRIPTIONS
-- =====================================================

-- Add billing_interval column to user_subscriptions table
ALTER TABLE user_subscriptions 
ADD COLUMN IF NOT EXISTS billing_interval VARCHAR(20);

-- =====================================================
-- STEP 3: MIGRATE EXISTING DATA (if interval column exists)
-- =====================================================

-- Copy data from interval to billing_interval in subscription_plans
UPDATE subscription_plans 
SET billing_interval = interval 
WHERE billing_interval IS NULL 
AND interval IS NOT NULL;

-- Copy data from interval to billing_interval in user_subscriptions
UPDATE user_subscriptions 
SET billing_interval = interval 
WHERE billing_interval IS NULL 
AND interval IS NOT NULL;

-- =====================================================
-- STEP 4: ADD CONSTRAINTS
-- =====================================================

-- Add check constraint to subscription_plans (only if it doesn't exist)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'check_subscription_plans_billing_interval'
        AND table_name = 'subscription_plans'
    ) THEN
        ALTER TABLE subscription_plans 
        ADD CONSTRAINT check_subscription_plans_billing_interval 
        CHECK (billing_interval IN ('monthly', 'yearly'));
    END IF;
END $$;

-- Add check constraint to user_subscriptions (only if it doesn't exist)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'check_user_subscriptions_billing_interval'
        AND table_name = 'user_subscriptions'
    ) THEN
        ALTER TABLE user_subscriptions 
        ADD CONSTRAINT check_user_subscriptions_billing_interval 
        CHECK (billing_interval IN ('monthly', 'yearly'));
    END IF;
END $$;

-- =====================================================
-- STEP 5: INSERT STARTUP PLANS
-- =====================================================

-- Insert startup plans (using INSERT ... ON CONFLICT with proper unique constraint)
-- First, create a unique constraint if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'unique_subscription_plan'
        AND table_name = 'subscription_plans'
    ) THEN
        ALTER TABLE subscription_plans 
        ADD CONSTRAINT unique_subscription_plan 
        UNIQUE (name, user_type, billing_interval, country);
    END IF;
END $$;

-- Insert startup plans
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
-- STEP 6: CREATE INDEXES
-- =====================================================

-- Create indexes for billing_interval
CREATE INDEX IF NOT EXISTS idx_subscription_plans_billing_interval ON subscription_plans(billing_interval);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_billing_interval ON user_subscriptions(billing_interval);

-- =====================================================
-- STEP 7: VERIFY THE FIX
-- =====================================================

-- Check if billing_interval column exists
SELECT 
    'Column Check' as check_type,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'subscription_plans' 
AND column_name = 'billing_interval';

-- Check startup plans
SELECT 
    'Startup Plans Check' as check_type,
    COUNT(*) as total_plans,
    COUNT(CASE WHEN billing_interval = 'monthly' THEN 1 END) as monthly_plans,
    COUNT(CASE WHEN billing_interval = 'yearly' THEN 1 END) as yearly_plans
FROM subscription_plans 
WHERE user_type = 'Startup' AND is_active = true;

-- Show the plans
SELECT 
    name,
    price,
    currency,
    billing_interval,
    country
FROM subscription_plans 
WHERE user_type = 'Startup' AND is_active = true
ORDER BY billing_interval, price;
