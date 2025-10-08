-- Migration Script: Fix billing_interval column issue
-- This script handles the case where subscription_plans table exists but doesn't have billing_interval column

-- =====================================================
-- STEP 1: CHECK IF TABLE EXISTS AND WHAT COLUMNS IT HAS
-- =====================================================

DO $$
DECLARE
    table_exists BOOLEAN;
    has_interval_column BOOLEAN;
    has_billing_interval_column BOOLEAN;
BEGIN
    -- Check if table exists
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'subscription_plans'
    ) INTO table_exists;
    
    IF table_exists THEN
        RAISE NOTICE 'Table subscription_plans exists';
        
        -- Check if it has 'interval' column
        SELECT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_name = 'subscription_plans' 
            AND column_name = 'interval'
        ) INTO has_interval_column;
        
        -- Check if it has 'billing_interval' column
        SELECT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_name = 'subscription_plans' 
            AND column_name = 'billing_interval'
        ) INTO has_billing_interval_column;
        
        RAISE NOTICE 'Has interval column: %', has_interval_column;
        RAISE NOTICE 'Has billing_interval column: %', has_billing_interval_column;
        
        -- If it has 'interval' but not 'billing_interval', we need to migrate
        IF has_interval_column AND NOT has_billing_interval_column THEN
            RAISE NOTICE 'Migration needed: interval -> billing_interval';
        ELSIF has_billing_interval_column THEN
            RAISE NOTICE 'Table already has billing_interval column';
        ELSE
            RAISE NOTICE 'Table exists but has neither interval nor billing_interval column';
        END IF;
    ELSE
        RAISE NOTICE 'Table subscription_plans does not exist';
    END IF;
END $$;

-- =====================================================
-- STEP 2: ALTER TABLE TO ADD BILLING_INTERVAL COLUMN
-- =====================================================

-- Add billing_interval column if it doesn't exist
ALTER TABLE subscription_plans 
ADD COLUMN IF NOT EXISTS billing_interval VARCHAR(20);

-- =====================================================
-- STEP 3: MIGRATE DATA FROM INTERVAL TO BILLING_INTERVAL
-- =====================================================

-- If interval column exists, copy data to billing_interval
DO $$
DECLARE
    has_interval_column BOOLEAN;
BEGIN
    -- Check if interval column exists
    SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'subscription_plans' 
        AND column_name = 'interval'
    ) INTO has_interval_column;
    
    IF has_interval_column THEN
        -- Copy data from interval to billing_interval
        UPDATE subscription_plans 
        SET billing_interval = interval 
        WHERE billing_interval IS NULL;
        
        RAISE NOTICE 'Migrated data from interval to billing_interval';
    ELSE
        RAISE NOTICE 'No interval column found, skipping data migration';
    END IF;
END $$;

-- =====================================================
-- STEP 4: ADD CONSTRAINTS TO BILLING_INTERVAL
-- =====================================================

-- Add check constraint to billing_interval
ALTER TABLE subscription_plans 
ADD CONSTRAINT check_billing_interval 
CHECK (billing_interval IN ('monthly', 'yearly'));

-- =====================================================
-- STEP 5: UPDATE USER_SUBSCRIPTIONS TABLE
-- =====================================================

-- Add billing_interval column to user_subscriptions if it doesn't exist
ALTER TABLE user_subscriptions 
ADD COLUMN IF NOT EXISTS billing_interval VARCHAR(20);

-- Migrate data from interval to billing_interval in user_subscriptions
DO $$
DECLARE
    has_interval_column BOOLEAN;
BEGIN
    -- Check if interval column exists in user_subscriptions
    SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'user_subscriptions' 
        AND column_name = 'interval'
    ) INTO has_interval_column;
    
    IF has_interval_column THEN
        -- Copy data from interval to billing_interval
        UPDATE user_subscriptions 
        SET billing_interval = interval 
        WHERE billing_interval IS NULL;
        
        RAISE NOTICE 'Migrated user_subscriptions data from interval to billing_interval';
    ELSE
        RAISE NOTICE 'No interval column found in user_subscriptions, skipping data migration';
    END IF;
END $$;

-- Add check constraint to user_subscriptions billing_interval
ALTER TABLE user_subscriptions 
ADD CONSTRAINT check_user_subscriptions_billing_interval 
CHECK (billing_interval IN ('monthly', 'yearly'));

-- =====================================================
-- STEP 6: INSERT OR UPDATE STARTUP PLANS
-- =====================================================

-- Insert startup plans with proper billing_interval
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
-- STEP 7: CREATE OR UPDATE INDEXES
-- =====================================================

-- Create indexes for billing_interval
CREATE INDEX IF NOT EXISTS idx_subscription_plans_billing_interval ON subscription_plans(billing_interval);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_billing_interval ON user_subscriptions(billing_interval);

-- =====================================================
-- STEP 8: CREATE OR REPLACE VIEWS
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
-- STEP 9: CREATE OR REPLACE FUNCTIONS
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

-- =====================================================
-- STEP 10: FINAL VERIFICATION
-- =====================================================

DO $$
DECLARE
    plan_count INTEGER;
    billing_interval_exists BOOLEAN;
BEGIN
    -- Check if billing_interval column exists
    SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'subscription_plans' 
        AND column_name = 'billing_interval'
    ) INTO billing_interval_exists;
    
    -- Count startup plans
    SELECT COUNT(*) INTO plan_count 
    FROM subscription_plans 
    WHERE user_type = 'Startup' AND is_active = true;
    
    RAISE NOTICE '=== MIGRATION COMPLETE ===';
    RAISE NOTICE 'Billing interval column exists: %', billing_interval_exists;
    RAISE NOTICE 'Startup plans created: %', plan_count;
    
    IF billing_interval_exists AND plan_count >= 2 THEN
        RAISE NOTICE '✅ SUCCESS: Migration completed successfully!';
    ELSE
        RAISE WARNING '❌ ISSUES: Migration may not have completed successfully.';
    END IF;
END $$;






