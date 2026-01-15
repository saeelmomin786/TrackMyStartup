-- =====================================================
-- BACKEND STORAGE CALCULATION FUNCTION
-- =====================================================
-- This function calculates storage from Supabase Storage buckets
-- and stores it in user_subscriptions.storage_used_mb
-- Can be called from backend API or scheduled job
-- =====================================================

-- =====================================================
-- FUNCTION: Calculate and Update Storage for User
-- =====================================================
-- This function will be called from backend API
-- It uses the user_storage_usage table which is updated
-- when files are uploaded/deleted via triggers

CREATE OR REPLACE FUNCTION calculate_user_storage_from_tracking(p_user_id UUID)
RETURNS DECIMAL(10,2) AS $$
DECLARE
    total_storage_mb DECIMAL(10,2);
BEGIN
    -- Calculate total storage from user_storage_usage table
    SELECT COALESCE(SUM(file_size_mb), 0) INTO total_storage_mb
    FROM user_storage_usage
    WHERE user_id = p_user_id;
    
    -- Update user_subscriptions with calculated storage
    UPDATE user_subscriptions
    SET storage_used_mb = total_storage_mb,
        updated_at = NOW()
    WHERE user_id = p_user_id
    AND status = 'active';
    
    RETURN total_storage_mb;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- FUNCTION: Calculate Storage for All Active Users
-- =====================================================
-- This can be called periodically (daily/hourly) to
-- recalculate storage for all users

CREATE OR REPLACE FUNCTION recalculate_all_user_storage()
RETURNS TABLE(user_id UUID, storage_mb DECIMAL(10,2)) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        us.user_id,
        calculate_user_storage_from_tracking(us.user_id) as storage_mb
    FROM user_subscriptions us
    WHERE us.status = 'active'
    GROUP BY us.user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================

GRANT EXECUTE ON FUNCTION calculate_user_storage_from_tracking(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION recalculate_all_user_storage() TO authenticated;

-- =====================================================
-- VERIFY FUNCTIONS
-- =====================================================

SELECT 
    routine_name,
    routine_type
FROM information_schema.routines
WHERE routine_name IN (
    'calculate_user_storage_from_tracking',
    'recalculate_all_user_storage'
)
AND routine_schema = 'public';

-- =====================================================
-- NOTES:
-- =====================================================
-- 1. This uses user_storage_usage table (fast)
-- 2. Backend API will call this function
-- 3. Can be scheduled to run periodically
-- 4. Frontend just reads storage_used_mb from database
-- =====================================================
