-- =====================================================
-- CREATE PAYMENT TRANSACTIONS TABLE
-- =====================================================
-- This table stores all payment transactions from both gateways

CREATE TABLE IF NOT EXISTS payment_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES user_subscriptions(id) ON DELETE SET NULL,
    payment_gateway VARCHAR(20) NOT NULL CHECK (payment_gateway IN ('razorpay', 'payaid')),
    gateway_order_id TEXT,
    gateway_payment_id TEXT,
    gateway_signature TEXT,
    gateway_customer_id TEXT,
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'EUR',
    status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'success', 'failed', 'refunded', 'cancelled')),
    plan_tier VARCHAR(20) NOT NULL CHECK (plan_tier IN ('free', 'basic', 'premium')),
    country VARCHAR(100),
    failure_reason TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_payment_transactions_user_id ON payment_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_gateway ON payment_transactions(payment_gateway, gateway_payment_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_status ON payment_transactions(status);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_subscription ON payment_transactions(subscription_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_created ON payment_transactions(created_at DESC);

-- =====================================================
-- CREATE FUNCTION TO GET USER PAYMENT HISTORY
-- =====================================================

CREATE OR REPLACE FUNCTION get_user_payment_history(p_user_id UUID, p_limit INTEGER DEFAULT 50)
RETURNS TABLE (
    id UUID,
    amount DECIMAL(10,2),
    currency VARCHAR(3),
    status VARCHAR(20),
    plan_tier VARCHAR(20),
    payment_gateway VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE,
    description TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        pt.id,
        pt.amount,
        pt.currency,
        pt.status,
        pt.plan_tier,
        pt.payment_gateway,
        pt.created_at,
        CONCAT(
            UPPER(pt.plan_tier), ' Plan - ',
            pt.payment_gateway, ' - ',
            pt.currency, ' ', pt.amount
        ) as description
    FROM payment_transactions pt
    WHERE pt.user_id = p_user_id
    ORDER BY pt.created_at DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================

GRANT SELECT ON payment_transactions TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_payment_history(UUID, INTEGER) TO authenticated;

-- =====================================================
-- ROW LEVEL SECURITY POLICIES
-- =====================================================

-- Enable RLS
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;

-- Users can only see their own payment transactions
CREATE POLICY "Users can view their own payment transactions"
    ON payment_transactions FOR SELECT
    USING (auth.uid() = user_id);

-- System can insert payment transactions (via service role)
-- Note: Insert/Update should be done via service role or API endpoints with proper authentication
