-- =====================================================
-- CREATE SUBSCRIPTION CHANGES TABLE
-- =====================================================
-- Tracks all subscription changes (upgrades, downgrades, autopay changes, etc.)

CREATE TABLE IF NOT EXISTS subscription_changes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subscription_id UUID NOT NULL REFERENCES user_subscriptions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Change Details
    change_type VARCHAR(20) NOT NULL CHECK (change_type IN ('upgrade', 'downgrade', 'cancel', 'reactivate', 'autopay_enable', 'autopay_disable')),
    plan_tier_before VARCHAR(20) CHECK (plan_tier_before IN ('free', 'basic', 'premium')),
    plan_tier_after VARCHAR(20) CHECK (plan_tier_after IN ('free', 'basic', 'premium')),
    
    -- Amount Changes (all in INR)
    amount_before_inr DECIMAL(10,2),
    amount_after_inr DECIMAL(10,2),
    
    -- Proration
    prorated_amount_inr DECIMAL(10,2),
    prorated_days INTEGER,
    
    -- Billing Cycle
    old_billing_end TIMESTAMP WITH TIME ZONE,
    new_billing_start TIMESTAMP WITH TIME ZONE,
    new_billing_end TIMESTAMP WITH TIME ZONE,
    
    -- Autopay Changes
    autopay_before BOOLEAN,
    autopay_after BOOLEAN,
    mandate_id_cancelled TEXT,
    mandate_id_created TEXT,
    
    -- Reason
    reason TEXT,
    initiated_by VARCHAR(20) CHECK (initiated_by IN ('user', 'admin', 'system')),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_subscription_changes_user_id ON subscription_changes(user_id);
CREATE INDEX IF NOT EXISTS idx_subscription_changes_subscription ON subscription_changes(subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscription_changes_type ON subscription_changes(change_type);
CREATE INDEX IF NOT EXISTS idx_subscription_changes_created ON subscription_changes(created_at DESC);

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================

GRANT SELECT ON subscription_changes TO authenticated;

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE subscription_changes ENABLE ROW LEVEL SECURITY;

-- Users can only see their own subscription changes
CREATE POLICY "Users can view their own subscription changes"
    ON subscription_changes FOR SELECT
    USING (auth.uid() = user_id);
