-- =====================================================
-- CREATE USER STORAGE USAGE TABLE
-- =====================================================
-- This table tracks all file uploads and storage usage per user

CREATE TABLE IF NOT EXISTS user_storage_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    file_type VARCHAR(50) NOT NULL, -- 'document', 'image', 'video', 'pitch_deck', etc.
    file_name VARCHAR(255) NOT NULL,
    file_size_mb DECIMAL(10,2) NOT NULL,
    storage_location TEXT NOT NULL, -- S3/Storage bucket path
    related_entity_type VARCHAR(50), -- 'startup', 'fundraising', 'grant', 'compliance', etc.
    related_entity_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_storage_user_id ON user_storage_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_user_storage_entity ON user_storage_usage(related_entity_type, related_entity_id);
CREATE INDEX IF NOT EXISTS idx_user_storage_created ON user_storage_usage(user_id, created_at DESC);

-- =====================================================
-- CREATE FUNCTION TO GET USER STORAGE TOTAL
-- =====================================================

CREATE OR REPLACE FUNCTION get_user_storage_total(p_user_id UUID)
RETURNS DECIMAL(10,2) AS $$
BEGIN
    RETURN COALESCE(
        (SELECT SUM(file_size_mb) 
         FROM user_storage_usage 
         WHERE user_id = p_user_id),
        0
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- CREATE FUNCTION TO UPDATE SUBSCRIPTION STORAGE
-- =====================================================

CREATE OR REPLACE FUNCTION update_subscription_storage_usage()
RETURNS TRIGGER AS $$
BEGIN
    -- Update user_subscriptions.storage_used_mb when storage changes
    UPDATE user_subscriptions
    SET storage_used_mb = (
        SELECT get_user_storage_total(NEW.user_id)
    ),
    updated_at = NOW()
    WHERE user_id = NEW.user_id
    AND status = 'active';
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update storage usage
DROP TRIGGER IF EXISTS trigger_update_storage_usage ON user_storage_usage;
CREATE TRIGGER trigger_update_storage_usage
    AFTER INSERT OR UPDATE OR DELETE ON user_storage_usage
    FOR EACH ROW
    EXECUTE FUNCTION update_subscription_storage_usage();

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON user_storage_usage TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_storage_total(UUID) TO authenticated;

-- =====================================================
-- ROW LEVEL SECURITY POLICIES
-- =====================================================

-- Enable RLS
ALTER TABLE user_storage_usage ENABLE ROW LEVEL SECURITY;

-- Users can only see their own storage usage
CREATE POLICY "Users can view their own storage usage"
    ON user_storage_usage FOR SELECT
    USING (auth.uid() = user_id);

-- Users can insert their own storage records
CREATE POLICY "Users can insert their own storage usage"
    ON user_storage_usage FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Users can update their own storage records
CREATE POLICY "Users can update their own storage usage"
    ON user_storage_usage FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Users can delete their own storage records
CREATE POLICY "Users can delete their own storage usage"
    ON user_storage_usage FOR DELETE
    USING (auth.uid() = user_id);
