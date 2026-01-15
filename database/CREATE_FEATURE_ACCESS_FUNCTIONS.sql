-- Create RPC functions for feature access checking
-- These functions are used by featureAccessService to check user permissions

-- Function to get user's plan tier
CREATE OR REPLACE FUNCTION get_user_plan_tier(p_user_id UUID)
RETURNS TEXT AS $$
DECLARE
    v_plan_tier TEXT;
BEGIN
    -- Get plan tier from active subscription
    SELECT sp.plan_tier INTO v_plan_tier
    FROM user_subscriptions us
    JOIN subscription_plans sp ON us.plan_id = sp.id
    WHERE us.user_id = p_user_id
    AND us.status = 'active'
    ORDER BY us.current_period_start DESC
    LIMIT 1;
    
    -- Return plan tier or 'free' if no active subscription
    RETURN COALESCE(v_plan_tier, 'free');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user can access a feature
CREATE OR REPLACE FUNCTION can_user_access_feature(p_user_id UUID, p_feature_name TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    v_plan_tier TEXT;
    v_is_enabled BOOLEAN;
BEGIN
    -- Get user's plan tier
    SELECT get_user_plan_tier(p_user_id) INTO v_plan_tier;
    
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

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_user_plan_tier(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION can_user_access_feature(UUID, TEXT) TO authenticated;
