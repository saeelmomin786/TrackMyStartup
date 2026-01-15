-- =====================================================
-- CREATE BILLING CYCLES TABLE
-- =====================================================
-- Tracks each billing period for subscriptions

CREATE TABLE IF NOT EXISTS billing_cycles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subscription_id UUID NOT NULL REFERENCES user_subscriptions(id) ON DELETE CASCADE,
    cycle_number INTEGER NOT NULL, -- 1, 2, 3...
    
    -- Period
    period_start TIMESTAMP WITH TIME ZONE NOT NULL,
    period_end TIMESTAMP WITH TIME ZONE NOT NULL,
    
    -- Payment
    payment_transaction_id UUID REFERENCES payment_transactions(id),
    amount DECIMAL(10,2) NOT NULL, -- Amount in INR
    currency VARCHAR(3) NOT NULL DEFAULT 'INR', -- Always INR
    status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'paid', 'failed', 'skipped')),
    
    -- Plan Details
    plan_tier VARCHAR(20) NOT NULL CHECK (plan_tier IN ('free', 'basic', 'premium')),
    locked_amount_inr DECIMAL(10,2), -- Locked amount for this cycle
    
    -- Autopay
    is_autopay BOOLEAN DEFAULT false,
    autopay_attempted_at TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(subscription_id, cycle_number)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_billing_cycles_subscription ON billing_cycles(subscription_id);
CREATE INDEX IF NOT EXISTS idx_billing_cycles_status ON billing_cycles(status);
CREATE INDEX IF NOT EXISTS idx_billing_cycles_period ON billing_cycles(period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_billing_cycles_cycle_number ON billing_cycles(subscription_id, cycle_number DESC);

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================

GRANT SELECT ON billing_cycles TO authenticated;

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE billing_cycles ENABLE ROW LEVEL SECURITY;

-- Users can only see billing cycles for their subscriptions
CREATE POLICY "Users can view their own billing cycles"
    ON billing_cycles FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM user_subscriptions
            WHERE user_subscriptions.id = billing_cycles.subscription_id
            AND user_subscriptions.user_id = auth.uid()
        )
    );
