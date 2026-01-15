-- =====================================================
-- ENHANCE FEATURE ACCESS WITH PERIOD END CHECK
-- =====================================================
-- Updates feature access functions to check subscription period
-- Features lock when period ends, even if status is 'active'
-- Run this in Supabase SQL Editor
-- =====================================================

-- =====================================================
-- DROP EXISTING FUNCTIONS (if they exist)
-- =====================================================

DROP FUNCTION IF EXISTS get_user_plan_tier(UUID);
DROP FUNCTION IF EXISTS can_user_access_feature(UUID, TEXT);
DROP FUNCTION IF EXISTS can_user_access_feature(UUID, VARCHAR);
DROP FUNCTION IF EXISTS is_subscription_valid(UUID);

-- =====================================================
-- UPDATE get_user_plan_tier FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION get_user_plan_tier(p_user_id UUID)
RETURNS TEXT AS $$
DECLARE
    v_plan_tier TEXT;
    v_status VARCHAR(20);
    v_period_end TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Get plan tier from active subscription
    -- Only return plan tier if:
    -- 1. status = 'active' AND current_period_end > NOW()
    -- 2. OR status = 'past_due' AND grace_period_ends_at > NOW()
    SELECT 
        sp.plan_tier,
        us.status,
        us.current_period_end
    INTO v_plan_tier, v_status, v_period_end
    FROM user_subscriptions us
    JOIN subscription_plans sp ON us.plan_id = sp.id
    WHERE us.user_id = p_user_id
    AND (
        -- Active subscription with valid period
        (us.status = 'active' AND us.current_period_end > NOW())
        OR
        -- Past due but still in grace period
        (us.status = 'past_due' AND us.grace_period_ends_at IS NOT NULL AND us.grace_period_ends_at > NOW())
    )
    ORDER BY us.current_period_start DESC
    LIMIT 1;
    
    -- Return plan tier or 'free' if no valid subscription
    RETURN COALESCE(v_plan_tier, 'free');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- UPDATE can_user_access_feature FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION can_user_access_feature(
    p_user_id UUID,
    p_feature_name TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
    v_plan_tier TEXT;
    v_is_enabled BOOLEAN;
BEGIN
    -- Get user's plan tier (already checks period end)
    v_plan_tier := get_user_plan_tier(p_user_id);
    
    -- If no valid subscription, return false (free plan)
    IF v_plan_tier = 'free' THEN
        -- Check if free plan has this feature
        SELECT is_enabled INTO v_is_enabled
        FROM plan_features
        WHERE plan_tier = 'free'
        AND feature_name = p_feature_name
        LIMIT 1;
        
        RETURN COALESCE(v_is_enabled, false);
    END IF;
    
    -- Check if feature is enabled for this plan tier
    SELECT is_enabled INTO v_is_enabled
    FROM plan_features
    WHERE plan_tier = v_plan_tier
    AND feature_name = p_feature_name
    LIMIT 1;
    
    -- Return true if enabled, false otherwise
    RETURN COALESCE(v_is_enabled, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- CREATE FUNCTION TO CHECK SUBSCRIPTION VALIDITY
-- =====================================================

CREATE OR REPLACE FUNCTION is_subscription_valid(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_count INTEGER;
BEGIN
    -- Check if user has a valid subscription
    -- Valid = active status AND period not expired
    -- OR past_due status AND grace period not expired
    SELECT COUNT(*) INTO v_count
    FROM user_subscriptions
    WHERE user_id = p_user_id
    AND (
        (status = 'active' AND current_period_end > NOW())
        OR
        (status = 'past_due' AND grace_period_ends_at IS NOT NULL AND grace_period_ends_at > NOW())
    );
    
    RETURN v_count > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_user_plan_tier(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION can_user_access_feature(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION is_subscription_valid(UUID) TO authenticated;

-- =====================================================
-- VERIFY FUNCTIONS
-- =====================================================

-- Test the functions
SELECT 
    'get_user_plan_tier' as function_name,
    get_user_plan_tier('00000000-0000-0000-0000-000000000000'::UUID) as test_result;

SELECT 
    'is_subscription_valid' as function_name,
    is_subscription_valid('00000000-0000-0000-0000-000000000000'::UUID) as test_result;

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ FEATURE ACCESS ENHANCED!';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE 'Functions Updated:';
    RAISE NOTICE '  ✓ get_user_plan_tier() - Now checks period end';
    RAISE NOTICE '  ✓ can_user_access_feature() - Now checks period end';
    RAISE NOTICE '  ✓ is_subscription_valid() - New function';
    RAISE NOTICE '';
    RAISE NOTICE 'Features will now lock when:';
    RAISE NOTICE '  - Subscription period ends (current_period_end < NOW())';
    RAISE NOTICE '  - Grace period expires (for past_due status)';
    RAISE NOTICE '  - Status is inactive or cancelled';
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
END $$;
