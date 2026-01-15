-- =====================================================
-- CREATE FUNCTION TO GET USER STORAGE LIMIT
-- =====================================================
-- This function returns the storage limit for a user based on their subscription plan.
-- For free users (no subscription), it returns 100 MB.
-- For paid users, it returns the limit from their active subscription plan.

CREATE OR REPLACE FUNCTION get_user_storage_limit(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
    v_storage_limit INTEGER;
BEGIN
    SELECT sp.storage_limit_mb INTO v_storage_limit
    FROM user_subscriptions us
    JOIN subscription_plans sp ON us.plan_id = sp.id
    WHERE us.user_id = p_user_id
    AND us.status = 'active'
    ORDER BY us.current_period_start DESC
    LIMIT 1;
    
    RETURN COALESCE(v_storage_limit, 100); -- Default to 100 MB for free users
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================

GRANT EXECUTE ON FUNCTION get_user_storage_limit(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_storage_limit(UUID) TO anon;

-- =====================================================
-- VERIFY FUNCTION EXISTS
-- =====================================================

-- Run this query to verify the function was created:
-- SELECT routine_name, routine_type 
-- FROM information_schema.routines 
-- WHERE routine_schema = 'public' 
-- AND routine_name = 'get_user_storage_limit';
