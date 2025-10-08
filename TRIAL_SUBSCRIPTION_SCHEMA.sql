-- Trial Subscription Database Schema Updates
-- This file contains the database updates for the 7-day trial subscription system

-- =====================================================
-- STEP 1: ENSURE TRIAL COLUMNS EXIST IN USER_SUBSCRIPTIONS
-- =====================================================

-- Add trial-related columns if they don't exist
ALTER TABLE user_subscriptions 
ADD COLUMN IF NOT EXISTS is_in_trial BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS trial_start TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS trial_end TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS razorpay_subscription_id TEXT;

-- =====================================================
-- STEP 2: CREATE INDEXES FOR TRIAL QUERIES
-- =====================================================

-- Index for finding active trial subscriptions
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_trial 
ON user_subscriptions(user_id, is_in_trial, status) 
WHERE is_in_trial = true AND status = 'active';

-- Index for trial end date queries
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_trial_end 
ON user_subscriptions(trial_end) 
WHERE is_in_trial = true;

-- Index for Razorpay subscription ID lookups
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_razorpay_id 
ON user_subscriptions(razorpay_subscription_id) 
WHERE razorpay_subscription_id IS NOT NULL;

-- =====================================================
-- STEP 3: CREATE TRIAL NOTIFICATIONS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS trial_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    subscription_id UUID NOT NULL REFERENCES user_subscriptions(id) ON DELETE CASCADE,
    notification_type VARCHAR(50) NOT NULL CHECK (notification_type IN ('trial_started', 'trial_ending_soon', 'trial_ended', 'payment_charged')),
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    read_at TIMESTAMP WITH TIME ZONE
);

-- Index for notification queries
CREATE INDEX IF NOT EXISTS idx_trial_notifications_user_id ON trial_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_trial_notifications_unread ON trial_notifications(user_id, is_read) WHERE is_read = false;

-- =====================================================
-- STEP 4: CREATE TRIAL AUDIT LOG TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS trial_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    subscription_id UUID NOT NULL REFERENCES user_subscriptions(id) ON DELETE CASCADE,
    action VARCHAR(50) NOT NULL CHECK (action IN ('trial_started', 'trial_ended', 'payment_charged', 'payment_failed', 'subscription_cancelled')),
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for audit log queries
CREATE INDEX IF NOT EXISTS idx_trial_audit_log_user_id ON trial_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_trial_audit_log_subscription_id ON trial_audit_log(subscription_id);
CREATE INDEX IF NOT EXISTS idx_trial_audit_log_action ON trial_audit_log(action);

-- =====================================================
-- STEP 5: CREATE FUNCTIONS FOR TRIAL MANAGEMENT
-- =====================================================

-- Function to check if user is in trial
CREATE OR REPLACE FUNCTION is_user_in_trial(user_uuid UUID)
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

-- Function to get trial days remaining
CREATE OR REPLACE FUNCTION get_trial_days_remaining(user_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
    trial_end_date TIMESTAMP WITH TIME ZONE;
BEGIN
    SELECT trial_end INTO trial_end_date
    FROM user_subscriptions 
    WHERE user_id = user_uuid 
    AND status = 'active' 
    AND is_in_trial = true;
    
    IF trial_end_date IS NULL THEN
        RETURN 0;
    END IF;
    
    RETURN GREATEST(0, EXTRACT(DAY FROM (trial_end_date - NOW())));
END;
$$ LANGUAGE plpgsql;

-- Function to end trial and convert to paid
CREATE OR REPLACE FUNCTION end_trial_and_convert(subscription_uuid UUID)
RETURNS VOID AS $$
DECLARE
    sub_record user_subscriptions%ROWTYPE;
    plan_record subscription_plans%ROWTYPE;
BEGIN
    -- Get subscription details
    SELECT * INTO sub_record FROM user_subscriptions WHERE id = subscription_uuid;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Subscription not found';
    END IF;
    
    -- Get plan details
    SELECT * INTO plan_record FROM subscription_plans WHERE id = sub_record.plan_id;
    
    -- Update subscription to end trial
    UPDATE user_subscriptions 
    SET 
        is_in_trial = false,
        amount = plan_record.price * sub_record.startup_count,
        current_period_start = NOW(),
        current_period_end = CASE 
            WHEN plan_record.interval = 'yearly' THEN NOW() + INTERVAL '1 year'
            ELSE NOW() + INTERVAL '1 month'
        END,
        updated_at = NOW()
    WHERE id = subscription_uuid;
    
    -- Log the action
    INSERT INTO trial_audit_log (user_id, subscription_id, action, details)
    VALUES (
        sub_record.user_id, 
        subscription_uuid, 
        'trial_ended',
        jsonb_build_object(
            'trial_start', sub_record.trial_start,
            'trial_end', sub_record.trial_end,
            'new_amount', plan_record.price * sub_record.startup_count
        )
    );
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- STEP 6: CREATE TRIGGERS FOR TRIAL MANAGEMENT
-- =====================================================

-- Trigger to create notification when trial starts
CREATE OR REPLACE FUNCTION create_trial_started_notification()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_in_trial = true AND (OLD.is_in_trial IS NULL OR OLD.is_in_trial = false) THEN
        INSERT INTO trial_notifications (user_id, subscription_id, notification_type, message)
        VALUES (
            NEW.user_id,
            NEW.id,
            'trial_started',
            'Your 7-day free trial has started! Enjoy full access to all features.'
        );
        
        INSERT INTO trial_audit_log (user_id, subscription_id, action, details)
        VALUES (
            NEW.user_id,
            NEW.id,
            'trial_started',
            jsonb_build_object(
                'trial_start', NEW.trial_start,
                'trial_end', NEW.trial_end
            )
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_trial_started_notification
    AFTER INSERT OR UPDATE ON user_subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION create_trial_started_notification();

-- =====================================================
-- STEP 7: CREATE VIEWS FOR TRIAL MANAGEMENT
-- =====================================================

-- View for active trial subscriptions
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
    sp.interval as plan_interval,
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

-- View for trial notifications
CREATE OR REPLACE VIEW user_trial_notifications AS
SELECT 
    tn.id,
    tn.user_id,
    tn.subscription_id,
    tn.notification_type,
    tn.message,
    tn.is_read,
    tn.created_at,
    tn.read_at,
    us.trial_start,
    us.trial_end,
    EXTRACT(DAY FROM (us.trial_end - NOW())) as days_remaining
FROM trial_notifications tn
JOIN user_subscriptions us ON tn.subscription_id = us.id
WHERE us.is_in_trial = true;

-- =====================================================
-- STEP 8: INSERT SAMPLE TRIAL NOTIFICATIONS
-- =====================================================

-- This will be handled by the application logic, but we can create some template messages
INSERT INTO trial_notifications (user_id, subscription_id, notification_type, message)
SELECT 
    '00000000-0000-0000-0000-000000000000'::uuid, -- Placeholder
    '00000000-0000-0000-0000-000000000000'::uuid, -- Placeholder
    'trial_started',
    'Your 7-day free trial has started! Enjoy full access to all features.'
WHERE false; -- This ensures no actual insert happens

-- =====================================================
-- STEP 9: GRANT PERMISSIONS
-- =====================================================

-- Grant necessary permissions for the application
GRANT SELECT, INSERT, UPDATE ON trial_notifications TO authenticated;
GRANT SELECT, INSERT ON trial_audit_log TO authenticated;
GRANT SELECT ON active_trial_subscriptions TO authenticated;
GRANT SELECT ON user_trial_notifications TO authenticated;

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION is_user_in_trial(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_trial_days_remaining(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION end_trial_and_convert(UUID) TO authenticated;






