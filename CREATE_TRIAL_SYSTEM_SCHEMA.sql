-- =====================================================
-- TRIAL SYSTEM DATABASE SCHEMA
-- =====================================================
-- This script creates the database schema for the 5-minute free trial system

-- 1. Add trial tracking columns to user_subscriptions table
ALTER TABLE user_subscriptions 
ADD COLUMN IF NOT EXISTS trial_start_time TIMESTAMP,
ADD COLUMN IF NOT EXISTS trial_end_time TIMESTAMP,
ADD COLUMN IF NOT EXISTS trial_expired BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS has_used_trial BOOLEAN DEFAULT FALSE;

-- 2. Create trial sessions table for tracking active trials
CREATE TABLE IF NOT EXISTS trial_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    startup_id INTEGER,
    trial_start_time TIMESTAMP NOT NULL DEFAULT NOW(),
    trial_end_time TIMESTAMP NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 3. Create subscription plans table (if not exists)
CREATE TABLE IF NOT EXISTS subscription_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'INR',
    billing_interval VARCHAR(20) NOT NULL, -- 'monthly' or 'yearly'
    description TEXT,
    user_type VARCHAR(50) DEFAULT 'Startup',
    country VARCHAR(100) DEFAULT 'India',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 4. Insert default subscription plans
-- Insert default plans idempotently without requiring a unique constraint
INSERT INTO subscription_plans (name, price, currency, billing_interval, description, user_type, country, is_active)
SELECT * FROM (
    VALUES 
        ('Monthly Plan', 299.00, 'INR', 'monthly', 'Monthly subscription for startup users', 'Startup', 'India', TRUE),
        ('Yearly Plan', 2999.00, 'INR', 'yearly', 'Yearly subscription for startup users', 'Startup', 'India', TRUE)
) AS v(name, price, currency, billing_interval, description, user_type, country, is_active)
WHERE NOT EXISTS (
    SELECT 1 FROM subscription_plans sp
    WHERE sp.name = v.name
      AND sp.user_type = v.user_type
      AND sp.country = v.country
      AND sp.billing_interval = v.billing_interval
);

-- 5. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_trial_sessions_user_id ON trial_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_trial_sessions_active ON trial_sessions(is_active);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_status ON user_subscriptions(status);

-- 6. Create function to check if user has active trial
CREATE OR REPLACE FUNCTION check_user_trial_status(user_uuid UUID)
RETURNS TABLE (
    has_active_trial BOOLEAN,
    trial_start_time TIMESTAMP,
    trial_end_time TIMESTAMP,
    minutes_remaining INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ts.is_active as has_active_trial,
        ts.trial_start_time,
        ts.trial_end_time,
        GREATEST(0, EXTRACT(EPOCH FROM (ts.trial_end_time - NOW())) / 60)::INTEGER as minutes_remaining
    FROM trial_sessions ts
    WHERE ts.user_id = user_uuid 
    AND ts.is_active = TRUE
    AND ts.trial_end_time > NOW()
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- 7. Create function to start trial for user
CREATE OR REPLACE FUNCTION start_user_trial(user_uuid UUID, startup_id_param INTEGER DEFAULT NULL)
RETURNS TABLE (
    trial_id UUID,
    trial_start_time TIMESTAMP,
    trial_end_time TIMESTAMP
) AS $$
DECLARE
    new_trial_id UUID;
    start_time TIMESTAMP := NOW();
    end_time TIMESTAMP := NOW() + INTERVAL '5 minutes';
BEGIN
    -- Check if user already has an active trial
    IF EXISTS (SELECT 1 FROM trial_sessions WHERE user_id = user_uuid AND is_active = TRUE) THEN
        RAISE EXCEPTION 'User already has an active trial';
    END IF;
    
    -- Check if user has already used their trial
    IF EXISTS (SELECT 1 FROM user_subscriptions WHERE user_id = user_uuid AND has_used_trial = TRUE) THEN
        RAISE EXCEPTION 'User has already used their free trial';
    END IF;
    
    -- Create new trial session
    INSERT INTO trial_sessions (user_id, startup_id, trial_start_time, trial_end_time, is_active)
    VALUES (user_uuid, startup_id_param, start_time, end_time, TRUE)
    RETURNING id INTO new_trial_id;
    
    -- Mark user as having used trial
    -- Mark user as having used trial (idempotent without requiring a constraint)
    UPDATE user_subscriptions
    SET has_used_trial = TRUE, updated_at = NOW()
    WHERE user_id = user_uuid;

    IF NOT FOUND THEN
        INSERT INTO user_subscriptions (user_id, has_used_trial, created_at, updated_at)
        VALUES (user_uuid, TRUE, NOW(), NOW());
    END IF;
    
    RETURN QUERY SELECT new_trial_id, start_time, end_time;
END;
$$ LANGUAGE plpgsql;

-- 8. Create function to end trial
CREATE OR REPLACE FUNCTION end_user_trial(user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE trial_sessions 
    SET is_active = FALSE, updated_at = NOW()
    WHERE user_id = user_uuid AND is_active = TRUE;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- 9. Create function to check if user has valid subscription
CREATE OR REPLACE FUNCTION check_user_subscription_status(user_uuid UUID)
RETURNS TABLE (
    has_valid_subscription BOOLEAN,
    subscription_id UUID,
    plan_name VARCHAR,
    status VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        TRUE as has_valid_subscription,
        us.id as subscription_id,
        sp.name as plan_name,
        us.status
    FROM user_subscriptions us
    JOIN subscription_plans sp ON us.plan_id = sp.id
    WHERE us.user_id = user_uuid 
    AND us.status = 'active'
    AND (us.current_period_end IS NULL OR us.current_period_end > NOW())
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- 10. Create trigger to automatically end expired trials
CREATE OR REPLACE FUNCTION auto_end_expired_trials()
RETURNS VOID AS $$
BEGIN
    UPDATE trial_sessions 
    SET is_active = FALSE, updated_at = NOW()
    WHERE is_active = TRUE AND trial_end_time <= NOW();
END;
$$ LANGUAGE plpgsql;

-- 11. Create a scheduled job to run auto_end_expired_trials every minute
-- Note: This would typically be set up in your application or using pg_cron
-- For now, we'll create the function and you can call it from your app

COMMENT ON TABLE trial_sessions IS 'Tracks active free trials for users';
COMMENT ON TABLE subscription_plans IS 'Available subscription plans';
COMMENT ON FUNCTION check_user_trial_status(UUID) IS 'Check if user has active trial and time remaining';
COMMENT ON FUNCTION start_user_trial(UUID, INTEGER) IS 'Start a 5-minute trial for user';
COMMENT ON FUNCTION end_user_trial(UUID) IS 'End user trial';
COMMENT ON FUNCTION check_user_subscription_status(UUID) IS 'Check if user has valid subscription';
COMMENT ON FUNCTION auto_end_expired_trials() IS 'Automatically end expired trials';
