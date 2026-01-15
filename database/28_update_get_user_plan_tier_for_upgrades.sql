-- =====================================================
-- UPDATE get_user_plan_tier TO RETURN HIGHEST TIER
-- =====================================================
-- When user has multiple active subscriptions (e.g., Basic + Premium during upgrade),
-- return the highest tier (premium > basic > free)
-- Run this in Supabase SQL Editor
-- =====================================================

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
    -- Get the HIGHEST plan tier from all valid active subscriptions
    -- Priority: premium > basic > free
    -- Only consider subscriptions that are:
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
    ORDER BY 
        -- Priority: premium > basic > free
        CASE sp.plan_tier
            WHEN 'premium' THEN 3
            WHEN 'basic' THEN 2
            WHEN 'free' THEN 1
            ELSE 0
        END DESC,
        -- If same tier, prefer most recent
        us.current_period_start DESC
    LIMIT 1;
    
    -- Return plan tier or 'free' if no valid subscription
    RETURN COALESCE(v_plan_tier, 'free');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_user_plan_tier(UUID) TO authenticated;

-- =====================================================
-- VERIFY FUNCTION
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ get_user_plan_tier UPDATED!';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE 'Function now returns HIGHEST tier when multiple subscriptions exist:';
    RAISE NOTICE '  - premium > basic > free';
    RAISE NOTICE '  - If same tier, returns most recent';
    RAISE NOTICE '';
    RAISE NOTICE 'This allows users to access Premium features immediately';
    RAISE NOTICE 'when upgrading, even if Basic subscription is still active.';
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
END $$;
