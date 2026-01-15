-- =====================================================
-- INVESTOR ADVISOR CREDIT SYSTEM
-- =====================================================
-- This script creates the database schema for the credit-based
-- subscription system where advisors can buy credits and assign
-- them to startups for Premium subscriptions.

-- =====================================================
-- STEP 1: ADD COLUMN TO USER_SUBSCRIPTIONS
-- =====================================================

-- Add paid_by_advisor_id column to track advisor-paid subscriptions
ALTER TABLE user_subscriptions 
ADD COLUMN IF NOT EXISTS paid_by_advisor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Add plan_tier column if it doesn't exist (for direct tier tracking)
ALTER TABLE user_subscriptions 
ADD COLUMN IF NOT EXISTS plan_tier VARCHAR(20) CHECK (plan_tier IN ('free', 'basic', 'premium'));

-- Create index for advisor-paid subscriptions lookup
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_paid_by_advisor 
ON user_subscriptions(paid_by_advisor_id) 
WHERE paid_by_advisor_id IS NOT NULL;

-- =====================================================
-- STEP 2: CREATE ADVISOR_CREDITS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS advisor_credits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    advisor_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Credit tracking
    credits_available INTEGER NOT NULL DEFAULT 0,
    credits_used INTEGER NOT NULL DEFAULT 0,
    credits_purchased INTEGER NOT NULL DEFAULT 0,
    
    -- Last purchase details (for reference)
    last_purchase_amount DECIMAL(10,2),
    last_purchase_currency VARCHAR(3) DEFAULT 'EUR',
    last_purchase_date TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(advisor_user_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_advisor_credits_advisor_user_id 
ON advisor_credits(advisor_user_id);

-- =====================================================
-- STEP 3: CREATE ADVISOR_CREDIT_ASSIGNMENTS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS advisor_credit_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    advisor_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    startup_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Credit period
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE NOT NULL, -- start_date + 1 month
    
    -- Status
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cancelled')),
    
    -- Auto-renewal control (toggle state)
    auto_renewal_enabled BOOLEAN DEFAULT true,
    
    -- Link to subscription (for tracking)
    subscription_id UUID REFERENCES user_subscriptions(id) ON DELETE SET NULL,
    
    -- Timestamps
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expired_at TIMESTAMP WITH TIME ZONE,
    
    -- Prevent duplicate active assignments
    CONSTRAINT unique_active_assignment 
    UNIQUE(advisor_user_id, startup_user_id) 
    DEFERRABLE INITIALLY DEFERRED
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_credit_assignments_advisor 
ON advisor_credit_assignments(advisor_user_id);

CREATE INDEX IF NOT EXISTS idx_credit_assignments_startup 
ON advisor_credit_assignments(startup_user_id);

CREATE INDEX IF NOT EXISTS idx_credit_assignments_status 
ON advisor_credit_assignments(status) 
WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_credit_assignments_end_date 
ON advisor_credit_assignments(end_date) 
WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_credit_assignments_auto_renewal 
ON advisor_credit_assignments(auto_renewal_enabled, end_date) 
WHERE status = 'active' AND auto_renewal_enabled = true;

-- =====================================================
-- STEP 4: CREATE CREDIT_PURCHASE_HISTORY TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS credit_purchase_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    advisor_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Purchase details
    credits_purchased INTEGER NOT NULL,
    amount_paid DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'EUR',
    payment_gateway VARCHAR(20) CHECK (payment_gateway IN ('razorpay', 'payaid')),
    payment_transaction_id TEXT,
    
    -- Status
    status VARCHAR(20) DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
    
    purchased_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Additional metadata
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_credit_purchase_history_advisor 
ON credit_purchase_history(advisor_user_id);

CREATE INDEX IF NOT EXISTS idx_credit_purchase_history_date 
ON credit_purchase_history(purchased_at DESC);

-- =====================================================
-- STEP 5: CREATE FUNCTION TO INITIALIZE ADVISOR CREDITS
-- =====================================================

CREATE OR REPLACE FUNCTION initialize_advisor_credits(advisor_id UUID)
RETURNS advisor_credits AS $$
DECLARE
    credit_record advisor_credits;
BEGIN
    -- Insert or get existing record
    INSERT INTO advisor_credits (advisor_user_id, credits_available, credits_used, credits_purchased)
    VALUES (advisor_id, 0, 0, 0)
    ON CONFLICT (advisor_user_id) 
    DO UPDATE SET updated_at = NOW()
    RETURNING * INTO credit_record;
    
    -- If record already existed, fetch it
    IF credit_record.id IS NULL THEN
        SELECT * INTO credit_record 
        FROM advisor_credits 
        WHERE advisor_user_id = advisor_id;
    END IF;
    
    RETURN credit_record;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- STEP 5.5: CREATE FUNCTION TO INCREMENT ADVISOR CREDITS
-- =====================================================

CREATE OR REPLACE FUNCTION increment_advisor_credits(
    p_advisor_user_id UUID,
    p_credits_to_add INTEGER,
    p_amount_paid DECIMAL(10,2),
    p_currency VARCHAR(3)
)
RETURNS advisor_credits AS $$
DECLARE
    credit_record advisor_credits;
BEGIN
    -- Insert or update credits atomically
    INSERT INTO advisor_credits (
        advisor_user_id,
        credits_available,
        credits_used,
        credits_purchased,
        last_purchase_amount,
        last_purchase_currency,
        last_purchase_date
    )
    VALUES (
        p_advisor_user_id,
        p_credits_to_add,
        0,
        p_credits_to_add,
        p_amount_paid,
        p_currency,
        NOW()
    )
    ON CONFLICT (advisor_user_id) 
    DO UPDATE SET
        credits_available = advisor_credits.credits_available + p_credits_to_add,
        credits_purchased = advisor_credits.credits_purchased + p_credits_to_add,
        last_purchase_amount = p_amount_paid,
        last_purchase_currency = p_currency,
        last_purchase_date = NOW(),
        updated_at = NOW()
    RETURNING * INTO credit_record;
    
    RETURN credit_record;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION increment_advisor_credits(UUID, INTEGER, DECIMAL, VARCHAR) TO authenticated;
GRANT EXECUTE ON FUNCTION increment_advisor_credits(UUID, INTEGER, DECIMAL, VARCHAR) TO anon;

-- =====================================================
-- STEP 6: CREATE FUNCTION TO GET ACTIVE CREDIT ASSIGNMENT
-- =====================================================

CREATE OR REPLACE FUNCTION get_active_credit_assignment(
    p_advisor_user_id UUID,
    p_startup_user_id UUID
)
RETURNS advisor_credit_assignments AS $$
DECLARE
    assignment_record advisor_credit_assignments;
BEGIN
    SELECT * INTO assignment_record
    FROM advisor_credit_assignments
    WHERE advisor_user_id = p_advisor_user_id
      AND startup_user_id = p_startup_user_id
      AND status = 'active'
      AND end_date > NOW()
    ORDER BY assigned_at DESC
    LIMIT 1;
    
    RETURN assignment_record;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- STEP 7: CREATE TRIGGER TO UPDATE ADVISOR_CREDITS UPDATED_AT
-- =====================================================

CREATE OR REPLACE FUNCTION update_advisor_credits_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_advisor_credits_updated_at ON advisor_credits;
CREATE TRIGGER trigger_update_advisor_credits_updated_at
BEFORE UPDATE ON advisor_credits
FOR EACH ROW
EXECUTE FUNCTION update_advisor_credits_updated_at();

-- =====================================================
-- STEP 8: CREATE FUNCTION TO CHECK IF STARTUP HAS ADVISOR-PAID SUBSCRIPTION
-- =====================================================

CREATE OR REPLACE FUNCTION has_advisor_paid_subscription(p_startup_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    has_subscription BOOLEAN;
BEGIN
    SELECT EXISTS(
        SELECT 1
        FROM user_subscriptions
        WHERE user_id = p_startup_user_id
          AND status = 'active'
          AND paid_by_advisor_id IS NOT NULL
          AND current_period_end > NOW()
    ) INTO has_subscription;
    
    RETURN COALESCE(has_subscription, false);
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- STEP 9: CREATE FUNCTION TO GET ADVISOR FOR STARTUP SUBSCRIPTION
-- =====================================================

CREATE OR REPLACE FUNCTION get_startup_advisor_id(p_startup_user_id UUID)
RETURNS UUID AS $$
DECLARE
    advisor_id UUID;
BEGIN
    SELECT paid_by_advisor_id INTO advisor_id
    FROM user_subscriptions
    WHERE user_id = p_startup_user_id
      AND status = 'active'
      AND paid_by_advisor_id IS NOT NULL
      AND current_period_end > NOW()
    ORDER BY created_at DESC
    LIMIT 1;
    
    RETURN advisor_id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- STEP 10: CREATE CREDIT PRICING CONFIGURATION TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS credit_pricing_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Country-specific pricing
    country VARCHAR(100) NOT NULL DEFAULT 'Global',
    price_per_credit DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) NOT NULL CHECK (currency IN ('INR', 'EUR')),
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(country)
);

-- Insert default pricing
INSERT INTO credit_pricing_config (country, price_per_credit, currency, is_active)
VALUES 
    ('India', 0, 'INR', true),  -- Admin will set actual price
    ('Global', 0, 'EUR', true)  -- Admin will set actual price for other countries
ON CONFLICT (country) DO NOTHING;

-- Create index
CREATE INDEX IF NOT EXISTS idx_credit_pricing_country 
ON credit_pricing_config(country) 
WHERE is_active = true;

-- =====================================================
-- STEP 11: CREATE CREDIT SUBSCRIPTION PLANS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS credit_subscription_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Plan details
    credits_per_month INTEGER NOT NULL CHECK (credits_per_month IN (5, 10, 15, 20)),
    plan_name VARCHAR(50) NOT NULL, -- e.g., "5 Credits Plan", "10 Credits Plan"
    
    -- Country-specific pricing (set by admin)
    country VARCHAR(100) NOT NULL DEFAULT 'Global',
    price_per_month DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) NOT NULL CHECK (currency IN ('INR', 'EUR')),
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(country, credits_per_month)
);

-- Insert default subscription plans (admin will set prices)
INSERT INTO credit_subscription_plans (credits_per_month, plan_name, country, price_per_month, currency, is_active)
VALUES 
    (5, '5 Credits Plan', 'India', 0, 'INR', true),
    (10, '10 Credits Plan', 'India', 0, 'INR', true),
    (15, '15 Credits Plan', 'India', 0, 'INR', true),
    (20, '20 Credits Plan', 'India', 0, 'INR', true),
    (5, '5 Credits Plan', 'Global', 0, 'EUR', true),
    (10, '10 Credits Plan', 'Global', 0, 'EUR', true),
    (15, '15 Credits Plan', 'Global', 0, 'EUR', true),
    (20, '20 Credits Plan', 'Global', 0, 'EUR', true)
ON CONFLICT (country, credits_per_month) DO NOTHING;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_credit_subscription_plans_country 
ON credit_subscription_plans(country) 
WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_credit_subscription_plans_credits 
ON credit_subscription_plans(credits_per_month) 
WHERE is_active = true;

-- =====================================================
-- STEP 12: CREATE ADVISOR CREDIT SUBSCRIPTIONS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS advisor_credit_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    advisor_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES credit_subscription_plans(id) ON DELETE RESTRICT,
    
    -- Subscription details
    credits_per_month INTEGER NOT NULL,
    price_per_month DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) NOT NULL,
    
    -- Payment gateway subscription IDs
    razorpay_subscription_id VARCHAR(255),
    paypal_subscription_id VARCHAR(255),
    
    -- Status
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'paused', 'cancelled', 'expired')),
    
    -- Billing cycle tracking
    current_period_start TIMESTAMP WITH TIME ZONE NOT NULL,
    current_period_end TIMESTAMP WITH TIME ZONE NOT NULL,
    next_billing_date TIMESTAMP WITH TIME ZONE,
    last_billing_date TIMESTAMP WITH TIME ZONE,
    billing_cycle_count INTEGER DEFAULT 0,
    total_paid DECIMAL(10,2) DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    cancelled_at TIMESTAMP WITH TIME ZONE
    
    -- Note: Removed unique constraint to allow multiple subscriptions per advisor
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_advisor_credit_subscriptions_advisor 
ON advisor_credit_subscriptions(advisor_user_id);

CREATE INDEX IF NOT EXISTS idx_advisor_credit_subscriptions_status 
ON advisor_credit_subscriptions(status) 
WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_advisor_credit_subscriptions_next_billing 
ON advisor_credit_subscriptions(next_billing_date) 
WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_advisor_credit_subscriptions_razorpay 
ON advisor_credit_subscriptions(razorpay_subscription_id) 
WHERE razorpay_subscription_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_advisor_credit_subscriptions_paypal 
ON advisor_credit_subscriptions(paypal_subscription_id) 
WHERE paypal_subscription_id IS NOT NULL;

-- =====================================================
-- STEP 12.5: CREATE FUNCTION TO CREATE/UPDATE SUBSCRIPTION
-- =====================================================

CREATE OR REPLACE FUNCTION create_subscription(
    p_advisor_user_id UUID,
    p_plan_id UUID,
    p_credits_per_month INTEGER,
    p_price_per_month DECIMAL(10,2),
    p_currency VARCHAR(3),
    p_razorpay_subscription_id VARCHAR(255) DEFAULT NULL,
    p_paypal_subscription_id VARCHAR(255) DEFAULT NULL
)
RETURNS advisor_credit_subscriptions AS $$
DECLARE
    subscription_record advisor_credit_subscriptions;
    period_start TIMESTAMP WITH TIME ZONE;
    period_end TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Calculate billing period
    period_start := NOW();
    period_end := period_start + INTERVAL '1 month';
    
    -- Insert new subscription (allow multiple subscriptions per advisor)
    INSERT INTO advisor_credit_subscriptions (
        advisor_user_id,
        plan_id,
        credits_per_month,
        price_per_month,
        currency,
        razorpay_subscription_id,
        paypal_subscription_id,
        status,
        current_period_start,
        current_period_end,
        next_billing_date,
        billing_cycle_count,
        total_paid
    )
    VALUES (
        p_advisor_user_id,
        p_plan_id,
        p_credits_per_month,
        p_price_per_month,
        p_currency,
        p_razorpay_subscription_id,
        p_paypal_subscription_id,
        'active',
        period_start,
        period_end,
        period_end,
        0,
        0
    )
    RETURNING * INTO subscription_record;
    
    RETURN subscription_record;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION create_subscription(UUID, UUID, INTEGER, DECIMAL, VARCHAR, VARCHAR, VARCHAR) TO authenticated;
GRANT EXECUTE ON FUNCTION create_subscription(UUID, UUID, INTEGER, DECIMAL, VARCHAR, VARCHAR, VARCHAR) TO anon;

-- =====================================================
-- STEP 13: CREATE TRIGGER TO UPDATE UPDATED_AT
-- =====================================================

CREATE OR REPLACE FUNCTION update_credit_subscription_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_credit_subscription_updated_at ON advisor_credit_subscriptions;
CREATE TRIGGER trigger_update_credit_subscription_updated_at
BEFORE UPDATE ON advisor_credit_subscriptions
FOR EACH ROW
EXECUTE FUNCTION update_credit_subscription_updated_at();

-- =====================================================
-- STEP 14: COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON TABLE advisor_credits IS 'Tracks credit balance for each investor advisor';
COMMENT ON TABLE advisor_credit_assignments IS 'Tracks credit assignments to startups with auto-renewal control';
COMMENT ON TABLE credit_purchase_history IS 'History of credit purchases by advisors';
COMMENT ON TABLE credit_pricing_config IS 'Admin-configured pricing for credits by country';
COMMENT ON TABLE credit_subscription_plans IS 'Monthly subscription plans for credits (5, 10, 15, 20 credits per month)';
COMMENT ON TABLE advisor_credit_subscriptions IS 'Active monthly subscriptions for advisors to receive credits automatically';
COMMENT ON COLUMN user_subscriptions.paid_by_advisor_id IS 'References the advisor who paid for this subscription';
COMMENT ON COLUMN advisor_credit_assignments.auto_renewal_enabled IS 'Toggle state: true = auto-renew when credits available, false = stop after current credit expires';
