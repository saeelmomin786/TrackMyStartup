-- =====================================================
-- ADD AUTOPAY CANCELLATION TRACKING COLUMNS
-- =====================================================
-- Tracks when and why autopay was cancelled
-- Handles both app-side and bank/UPI-side cancellations
-- Run this in Supabase SQL Editor
-- =====================================================

-- Add autopay cancellation tracking columns
ALTER TABLE user_subscriptions 
ADD COLUMN IF NOT EXISTS autopay_cancelled_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE user_subscriptions 
ADD COLUMN IF NOT EXISTS autopay_cancellation_reason VARCHAR(50);
-- Values: 'user_cancelled', 'cancelled_from_bank', 'payment_failed', 'admin_cancelled', 'mandate_revoked'

ALTER TABLE user_subscriptions 
ADD COLUMN IF NOT EXISTS mandate_last_synced_at TIMESTAMP WITH TIME ZONE;
-- Track when we last checked mandate status from Razorpay

-- Add payment failure tracking columns
ALTER TABLE user_subscriptions 
ADD COLUMN IF NOT EXISTS payment_failure_count INTEGER DEFAULT 0;

ALTER TABLE user_subscriptions 
ADD COLUMN IF NOT EXISTS last_payment_failure_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE user_subscriptions 
ADD COLUMN IF NOT EXISTS grace_period_ends_at TIMESTAMP WITH TIME ZONE;
-- Grace period after payment failure (typically 3-7 days)

ALTER TABLE user_subscriptions 
ADD COLUMN IF NOT EXISTS max_retry_attempts INTEGER DEFAULT 3;
-- Maximum retry attempts before marking as inactive

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_autopay_cancelled 
ON user_subscriptions(autopay_cancelled_at) 
WHERE autopay_cancelled_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_user_subscriptions_grace_period 
ON user_subscriptions(grace_period_ends_at) 
WHERE grace_period_ends_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_user_subscriptions_past_due 
ON user_subscriptions(status, grace_period_ends_at) 
WHERE status = 'past_due';

-- =====================================================
-- UPDATE SUBSCRIPTION_CHANGES FOR AUTOPAY CANCELLATION
-- =====================================================

-- Ensure subscription_changes can track bank cancellations
-- (Table already exists, just verify it has the right columns)

-- =====================================================
-- CREATE FUNCTION TO CHECK AND EXPIRE SUBSCRIPTIONS
-- =====================================================

CREATE OR REPLACE FUNCTION check_and_expire_subscriptions()
RETURNS TABLE (
    expired_count INTEGER,
    expired_subscription_ids UUID[]
) AS $$
DECLARE
    v_expired_ids UUID[];
    v_count INTEGER;
BEGIN
    -- Find subscriptions that should be expired:
    -- 1. current_period_end has passed
    -- 2. status is 'active' or 'past_due'
    -- 3. autopay is disabled OR grace period expired
    
    SELECT ARRAY_AGG(id), COUNT(*)
    INTO v_expired_ids, v_count
    FROM user_subscriptions
    WHERE status IN ('active', 'past_due')
    AND current_period_end < NOW()
    AND (
        autopay_enabled = false 
        OR (status = 'past_due' AND (grace_period_ends_at IS NULL OR grace_period_ends_at < NOW()))
    );
    
    -- Update expired subscriptions to 'inactive'
    IF v_count > 0 THEN
        UPDATE user_subscriptions
        SET 
            status = 'inactive',
            updated_at = NOW()
        WHERE id = ANY(v_expired_ids);
        
        -- Record expiration in subscription_changes
        INSERT INTO subscription_changes (
            subscription_id,
            user_id,
            change_type,
            plan_tier_before,
            reason,
            initiated_by
        )
        SELECT 
            us.id,
            us.user_id,
            'cancel',
            sp.plan_tier,
            'Subscription expired - period ended and autopay disabled or payment failed',
            'system'
        FROM user_subscriptions us
        JOIN subscription_plans sp ON us.plan_id = sp.id
        WHERE us.id = ANY(v_expired_ids);
    END IF;
    
    RETURN QUERY SELECT v_count, v_expired_ids;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION check_and_expire_subscriptions() TO authenticated;

-- =====================================================
-- CREATE FUNCTION TO HANDLE PAYMENT FAILURE
-- =====================================================

CREATE OR REPLACE FUNCTION handle_subscription_payment_failure(
    p_subscription_id UUID,
    p_failure_reason TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    v_current_failures INTEGER;
    v_max_retries INTEGER;
    v_grace_period_days INTEGER := 7; -- 7 days grace period
BEGIN
    -- Get current failure count and max retries
    SELECT payment_failure_count, max_retry_attempts
    INTO v_current_failures, v_max_retries
    FROM user_subscriptions
    WHERE id = p_subscription_id;
    
    -- Increment failure count
    UPDATE user_subscriptions
    SET 
        payment_failure_count = COALESCE(payment_failure_count, 0) + 1,
        last_payment_failure_at = NOW(),
        status = CASE 
            WHEN COALESCE(payment_failure_count, 0) + 1 >= COALESCE(max_retry_attempts, 3) THEN 'inactive'
            ELSE 'past_due'
        END,
        grace_period_ends_at = NOW() + (v_grace_period_days || ' days')::INTERVAL,
        updated_at = NOW()
    WHERE id = p_subscription_id;
    
    -- Record in subscription_changes
    INSERT INTO subscription_changes (
        subscription_id,
        user_id,
        change_type,
        plan_tier_before,
        reason,
        initiated_by
    )
    SELECT 
        us.id,
        us.user_id,
        'cancel',
        sp.plan_tier,
        COALESCE(p_failure_reason, 'Payment failed - autopay charge unsuccessful'),
        'system'
    FROM user_subscriptions us
    JOIN subscription_plans sp ON us.plan_id = sp.id
    WHERE us.id = p_subscription_id;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION handle_subscription_payment_failure(UUID, TEXT) TO authenticated;

-- =====================================================
-- CREATE FUNCTION TO HANDLE AUTOPAY CANCELLATION
-- =====================================================

CREATE OR REPLACE FUNCTION handle_autopay_cancellation(
    p_subscription_id UUID,
    p_cancellation_reason VARCHAR(50),
    p_initiated_by VARCHAR(20) DEFAULT 'user'
)
RETURNS BOOLEAN AS $$
DECLARE
    v_plan_tier VARCHAR(20);
BEGIN
    -- Get plan tier
    SELECT sp.plan_tier INTO v_plan_tier
    FROM user_subscriptions us
    JOIN subscription_plans sp ON us.plan_id = sp.id
    WHERE us.id = p_subscription_id;
    
    -- Update subscription
    UPDATE user_subscriptions
    SET 
        autopay_enabled = false,
        mandate_status = 'cancelled',
        autopay_cancelled_at = NOW(),
        autopay_cancellation_reason = p_cancellation_reason,
        -- Keep status as 'active' until period ends
        status = CASE 
            WHEN current_period_end > NOW() THEN 'active'
            ELSE 'inactive'
        END,
        updated_at = NOW()
    WHERE id = p_subscription_id;
    
    -- Record in subscription_changes
    INSERT INTO subscription_changes (
        subscription_id,
        user_id,
        change_type,
        plan_tier_before,
        autopay_before,
        autopay_after,
        reason,
        initiated_by
    )
    SELECT 
        us.id,
        us.user_id,
        'autopay_disable',
        v_plan_tier,
        true,
        false,
        'Autopay cancelled: ' || p_cancellation_reason,
        p_initiated_by
    FROM user_subscriptions us
    WHERE us.id = p_subscription_id;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION handle_autopay_cancellation(UUID, VARCHAR, VARCHAR) TO authenticated;

-- =====================================================
-- VERIFY SETUP
-- =====================================================

-- Check columns were added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'user_subscriptions' 
AND column_name IN (
    'autopay_cancelled_at',
    'autopay_cancellation_reason',
    'mandate_last_synced_at',
    'payment_failure_count',
    'last_payment_failure_at',
    'grace_period_ends_at',
    'max_retry_attempts'
)
ORDER BY column_name;

-- Verify functions were created
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN (
    'check_and_expire_subscriptions',
    'handle_subscription_payment_failure',
    'handle_autopay_cancellation'
)
ORDER BY routine_name;

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ AUTOPAY CANCELLATION TRACKING SETUP!';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE 'Columns Added:';
    RAISE NOTICE '  ✓ autopay_cancelled_at';
    RAISE NOTICE '  ✓ autopay_cancellation_reason';
    RAISE NOTICE '  ✓ mandate_last_synced_at';
    RAISE NOTICE '  ✓ payment_failure_count';
    RAISE NOTICE '  ✓ last_payment_failure_at';
    RAISE NOTICE '  ✓ grace_period_ends_at';
    RAISE NOTICE '  ✓ max_retry_attempts';
    RAISE NOTICE '';
    RAISE NOTICE 'Functions Created:';
    RAISE NOTICE '  ✓ check_and_expire_subscriptions()';
    RAISE NOTICE '  ✓ handle_subscription_payment_failure()';
    RAISE NOTICE '  ✓ handle_autopay_cancellation()';
    RAISE NOTICE '';
    RAISE NOTICE 'Next Steps:';
    RAISE NOTICE '  1. Update webhook handlers in server.js';
    RAISE NOTICE '  2. Create API endpoints for stop autopay';
    RAISE NOTICE '  3. Update feature access service';
    RAISE NOTICE '  4. Update AccountTab component';
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
END $$;
