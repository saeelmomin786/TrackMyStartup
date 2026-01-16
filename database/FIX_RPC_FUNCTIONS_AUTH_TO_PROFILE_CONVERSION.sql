-- =====================================================
-- FIX RPC FUNCTIONS: Add auth_user_id to profile_id conversion
-- =====================================================
-- Problem: RPC functions receive auth_user_id but query with profile_id
-- Solution: Create helper function + update all RPC functions
-- =====================================================

-- STEP 1: Create helper function to convert auth_user_id to profile_ids
-- =====================================================

CREATE OR REPLACE FUNCTION convert_auth_id_to_profile_ids(p_auth_user_id UUID)
RETURNS UUID[] AS $$
DECLARE
    v_profile_ids UUID[];
BEGIN
    -- Check if p_auth_user_id is already a profile_id
    SELECT ARRAY[id] INTO v_profile_ids
    FROM user_profiles
    WHERE id = p_auth_user_id
    LIMIT 1;
    
    -- If found as profile_id, return it
    IF v_profile_ids IS NOT NULL THEN
        RETURN v_profile_ids;
    END IF;
    
    -- Otherwise, convert from auth_user_id to ALL profile_ids
    SELECT ARRAY_AGG(id)
    INTO v_profile_ids
    FROM user_profiles
    WHERE auth_user_id = p_auth_user_id;
    
    -- Return array (empty if no profiles found)
    RETURN COALESCE(v_profile_ids, ARRAY[]::UUID[]);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- STEP 2: Update get_user_plan_tier to use conversion
-- =====================================================

CREATE OR REPLACE FUNCTION get_user_plan_tier(p_user_id UUID)
RETURNS TEXT AS $$
DECLARE
    v_plan_tier TEXT;
    v_profile_ids UUID[];
BEGIN
    -- Convert auth_user_id to profile_ids (handles both auth_user_id and profile_id inputs)
    v_profile_ids := convert_auth_id_to_profile_ids(p_user_id);
    
    -- If no profiles found, return free tier
    IF array_length(v_profile_ids, 1) IS NULL THEN
        RETURN 'free';
    END IF;
    
    -- Get plan tier from active subscription (check ALL profiles)
    SELECT sp.plan_tier INTO v_plan_tier
    FROM user_subscriptions us
    JOIN subscription_plans sp ON us.plan_id = sp.id
    WHERE us.user_id = ANY(v_profile_ids)
    AND us.status = 'active'
    AND us.current_period_end > NOW()
    ORDER BY us.current_period_start DESC
    LIMIT 1;
    
    -- Return plan tier or 'free' if no active subscription
    RETURN COALESCE(v_plan_tier, 'free');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- STEP 3: Update can_user_access_feature to use conversion
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
    -- Get user's plan tier (now handles auth_user_id conversion internally)
    v_plan_tier := get_user_plan_tier(p_user_id);
    
    -- If no valid subscription, check free plan
    IF v_plan_tier = 'free' THEN
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

-- STEP 4: Update is_subscription_valid to use conversion
-- =====================================================

CREATE OR REPLACE FUNCTION is_subscription_valid(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_count INTEGER;
    v_profile_ids UUID[];
BEGIN
    -- Convert auth_user_id to profile_ids
    v_profile_ids := convert_auth_id_to_profile_ids(p_user_id);
    
    -- If no profiles found, no valid subscription
    IF array_length(v_profile_ids, 1) IS NULL THEN
        RETURN false;
    END IF;
    
    -- Check if user has a valid subscription (check ALL profiles)
    -- Valid = active status AND period not expired
    -- OR past_due status AND grace period not expired
    SELECT COUNT(*) INTO v_count
    FROM user_subscriptions
    WHERE user_id = ANY(v_profile_ids)
    AND (
        (status = 'active' AND current_period_end > NOW())
        OR
        (status = 'past_due' AND grace_period_ends_at IS NOT NULL AND grace_period_ends_at > NOW())
    );
    
    RETURN v_count > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- STEP 5: Grant permissions
-- =====================================================

GRANT EXECUTE ON FUNCTION convert_auth_id_to_profile_ids(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_plan_tier(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION can_user_access_feature(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION is_subscription_valid(UUID) TO authenticated;

-- =====================================================
-- VERIFICATION
-- =====================================================

-- Check that all functions are created
SELECT 
    routine_name,
    routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN (
    'convert_auth_id_to_profile_ids',
    'get_user_plan_tier',
    'can_user_access_feature',
    'is_subscription_valid'
)
ORDER BY routine_name;
