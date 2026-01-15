-- =====================================================
-- CREATE PAYMENT TRANSACTIONS TABLE
-- =====================================================
-- Stores all payment transactions (initial, recurring, upgrades, etc.)

CREATE TABLE IF NOT EXISTS payment_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES user_subscriptions(id) ON DELETE SET NULL,
    
    -- Payment Gateway Details
    payment_gateway VARCHAR(20) NOT NULL CHECK (payment_gateway IN ('razorpay', 'payaid')),
    gateway_order_id TEXT,
    gateway_payment_id TEXT,
    gateway_signature TEXT,
    gateway_customer_id TEXT,
    
    -- Amount Details (always in INR)
    amount DECIMAL(10,2) NOT NULL, -- Amount in INR
    currency VARCHAR(3) NOT NULL DEFAULT 'INR', -- Always INR
    base_amount_eur DECIMAL(10,2), -- Original EUR base price (for reference)
    locked_amount_inr DECIMAL(10,2), -- Locked amount at time of payment
    
    -- Transaction Details
    status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'success', 'failed', 'refunded', 'cancelled')),
    payment_type VARCHAR(20) NOT NULL CHECK (payment_type IN ('initial', 'recurring', 'upgrade', 'downgrade', 'manual')),
    payment_method VARCHAR(50), -- 'card', 'upi', 'netbanking', etc.
    
    -- Billing Cycle
    billing_cycle_number INTEGER, -- 1, 2, 3... (which month of subscription)
    billing_period_start TIMESTAMP WITH TIME ZONE,
    billing_period_end TIMESTAMP WITH TIME ZONE,
    
    -- Plan Details
    plan_tier VARCHAR(20) NOT NULL CHECK (plan_tier IN ('free', 'basic', 'premium')),
    plan_tier_before VARCHAR(20), -- For upgrades/downgrades
    plan_tier_after VARCHAR(20), -- For upgrades/downgrades
    
    -- Autopay Details
    is_autopay BOOLEAN DEFAULT false,
    autopay_mandate_id TEXT,
    
    -- Failure Details
    failure_reason TEXT,
    retry_count INTEGER DEFAULT 0,
    next_retry_at TIMESTAMP WITH TIME ZONE,
    
    -- Metadata
    country VARCHAR(100),
    metadata JSONB DEFAULT '{}'::jsonb,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    paid_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_payment_transactions_user_id ON payment_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_subscription ON payment_transactions(subscription_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_gateway ON payment_transactions(payment_gateway, gateway_payment_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_status ON payment_transactions(status);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_created ON payment_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_type ON payment_transactions(payment_type);

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================

GRANT SELECT ON payment_transactions TO authenticated;

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;

-- Users can only see their own payment transactions
CREATE POLICY "Users can view their own payment transactions"
    ON payment_transactions FOR SELECT
    USING (auth.uid() = user_id);
