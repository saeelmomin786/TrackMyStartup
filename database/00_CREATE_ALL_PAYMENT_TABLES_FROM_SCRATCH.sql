-- =====================================================
-- COMPLETE PAYMENT SYSTEM - CREATE FROM SCRATCH
-- =====================================================
-- This script creates ALL payment-related tables from scratch
-- Safe to run even if tables don't exist
-- Run this in Supabase SQL Editor
-- =====================================================

-- =====================================================
-- STEP 1: CREATE COUNTRY PLAN PRICES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS country_plan_prices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    country VARCHAR(100) NOT NULL,
    plan_tier VARCHAR(20) NOT NULL CHECK (plan_tier IN ('free', 'basic', 'premium')),
    price_inr DECIMAL(10,2) NOT NULL, -- Price in Indian Rupees
    payment_gateway VARCHAR(20) NOT NULL CHECK (payment_gateway IN ('razorpay', 'payaid')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(country, plan_tier)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_country_plan_prices_country ON country_plan_prices(country);
CREATE INDEX IF NOT EXISTS idx_country_plan_prices_tier ON country_plan_prices(plan_tier);
CREATE INDEX IF NOT EXISTS idx_country_plan_prices_active ON country_plan_prices(is_active) WHERE is_active = true;

-- =====================================================
-- STEP 2: ENSURE SUBSCRIPTION PLANS TABLE EXISTS
-- =====================================================

CREATE TABLE IF NOT EXISTS subscription_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'EUR',
    interval VARCHAR(20) NOT NULL CHECK (interval IN ('monthly', 'yearly')),
    description TEXT,
    user_type VARCHAR(50) NOT NULL CHECK (user_type IN ('Investor', 'Startup', 'Startup Facilitation Center', 'Investment Advisor')),
    country VARCHAR(100) DEFAULT 'Global',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add plan_tier column if it doesn't exist
ALTER TABLE subscription_plans 
ADD COLUMN IF NOT EXISTS plan_tier VARCHAR(20) CHECK (plan_tier IN ('free', 'basic', 'premium'));

-- Add storage_limit_mb column if it doesn't exist
ALTER TABLE subscription_plans 
ADD COLUMN IF NOT EXISTS storage_limit_mb INTEGER DEFAULT 100;

-- Add features JSONB column if it doesn't exist
ALTER TABLE subscription_plans 
ADD COLUMN IF NOT EXISTS features JSONB DEFAULT '{}'::jsonb;

-- =====================================================
-- STEP 3: ENSURE USER SUBSCRIPTIONS TABLE EXISTS
-- =====================================================

CREATE TABLE IF NOT EXISTS user_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    plan_id UUID REFERENCES subscription_plans(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'cancelled', 'past_due')),
    current_period_start TIMESTAMP WITH TIME ZONE NOT NULL,
    current_period_end TIMESTAMP WITH TIME ZONE NOT NULL,
    startup_count INTEGER DEFAULT 0,
    amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    interval VARCHAR(20) NOT NULL CHECK (interval IN ('monthly', 'yearly')),
    
    -- Trial support columns
    is_in_trial BOOLEAN DEFAULT false,
    trial_start TIMESTAMP WITH TIME ZONE,
    trial_end TIMESTAMP WITH TIME ZONE,
    has_used_trial BOOLEAN DEFAULT false,
    
    -- Payment gateway linkage
    razorpay_subscription_id TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(user_id, plan_id)
);

-- Add payment-related columns
ALTER TABLE user_subscriptions 
ADD COLUMN IF NOT EXISTS locked_amount_inr DECIMAL(10,2);

ALTER TABLE user_subscriptions 
ADD COLUMN IF NOT EXISTS country VARCHAR(100);

ALTER TABLE user_subscriptions 
ADD COLUMN IF NOT EXISTS payment_gateway VARCHAR(20) CHECK (payment_gateway IN ('razorpay', 'payaid'));

-- Add autopay columns
ALTER TABLE user_subscriptions 
ADD COLUMN IF NOT EXISTS autopay_enabled BOOLEAN DEFAULT false;

ALTER TABLE user_subscriptions 
ADD COLUMN IF NOT EXISTS razorpay_mandate_id TEXT;

ALTER TABLE user_subscriptions 
ADD COLUMN IF NOT EXISTS payaid_subscription_id TEXT;

ALTER TABLE user_subscriptions 
ADD COLUMN IF NOT EXISTS mandate_status VARCHAR(20) CHECK (mandate_status IN ('pending', 'active', 'paused', 'cancelled'));

ALTER TABLE user_subscriptions 
ADD COLUMN IF NOT EXISTS mandate_created_at TIMESTAMP WITH TIME ZONE;

-- Add billing cycle columns
ALTER TABLE user_subscriptions 
ADD COLUMN IF NOT EXISTS next_billing_date TIMESTAMP WITH TIME ZONE;

ALTER TABLE user_subscriptions 
ADD COLUMN IF NOT EXISTS last_billing_date TIMESTAMP WITH TIME ZONE;

ALTER TABLE user_subscriptions 
ADD COLUMN IF NOT EXISTS billing_cycle_count INTEGER DEFAULT 0;

ALTER TABLE user_subscriptions 
ADD COLUMN IF NOT EXISTS total_paid DECIMAL(10,2) DEFAULT 0;

-- Add plan change tracking
ALTER TABLE user_subscriptions 
ADD COLUMN IF NOT EXISTS previous_plan_tier VARCHAR(20);

ALTER TABLE user_subscriptions 
ADD COLUMN IF NOT EXISTS previous_subscription_id UUID;

ALTER TABLE user_subscriptions 
ADD COLUMN IF NOT EXISTS change_reason TEXT;

-- Create indexes for user_subscriptions
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_country ON user_subscriptions(country) WHERE country IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_gateway ON user_subscriptions(payment_gateway) WHERE payment_gateway IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_mandate ON user_subscriptions(razorpay_mandate_id) WHERE razorpay_mandate_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_next_billing ON user_subscriptions(next_billing_date) WHERE next_billing_date IS NOT NULL;

-- =====================================================
-- STEP 4: CREATE PAYMENT TRANSACTIONS TABLE
-- =====================================================

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

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_payment_transactions_user_id ON payment_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_subscription ON payment_transactions(subscription_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_gateway ON payment_transactions(payment_gateway, gateway_payment_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_status ON payment_transactions(status);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_created ON payment_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_type ON payment_transactions(payment_type);

-- =====================================================
-- STEP 5: CREATE BILLING CYCLES TABLE
-- =====================================================

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
-- STEP 6: CREATE SUBSCRIPTION CHANGES TABLE
-- =====================================================

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
-- STEP 7: CREATE PLAN FEATURES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS plan_features (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_tier VARCHAR(20) NOT NULL CHECK (plan_tier IN ('free', 'basic', 'premium')),
    feature_name VARCHAR(100) NOT NULL,
    is_enabled BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(plan_tier, feature_name)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_plan_features_tier ON plan_features(plan_tier);
CREATE INDEX IF NOT EXISTS idx_plan_features_feature ON plan_features(feature_name);
CREATE INDEX IF NOT EXISTS idx_plan_features_enabled ON plan_features(plan_tier, is_enabled) WHERE is_enabled = true;

-- Insert feature access rules
-- Free Plan Features
INSERT INTO plan_features (plan_tier, feature_name, is_enabled) VALUES
('free', 'dashboard', true),
('free', 'financials', true),
('free', 'compliance', true),
('free', 'profile', true),
('free', 'portfolio_fundraising', false),
('free', 'grants_draft', false),
('free', 'grants_add_to_crm', false),
('free', 'investor_ai_matching', false),
('free', 'investor_add_to_crm', false),
('free', 'crm_access', false),
('free', 'fundraising_active', false),
('free', 'fund_utilization_report', false)
ON CONFLICT (plan_tier, feature_name) 
DO UPDATE SET 
    is_enabled = EXCLUDED.is_enabled,
    updated_at = NOW();

-- Basic Plan Features (Standard Plan)
INSERT INTO plan_features (plan_tier, feature_name, is_enabled) VALUES
('basic', 'dashboard', true),
('basic', 'financials', true),
('basic', 'compliance', true),
('basic', 'profile', true),
('basic', 'portfolio_fundraising', true),
('basic', 'grants_draft', true),
('basic', 'grants_add_to_crm', true),
('basic', 'investor_ai_matching', false), -- Premium only
('basic', 'investor_add_to_crm', false), -- Premium only
('basic', 'crm_access', true),
('basic', 'fundraising_active', false),
('basic', 'fund_utilization_report', true) -- Available in Standard and Premium
ON CONFLICT (plan_tier, feature_name) 
DO UPDATE SET 
    is_enabled = EXCLUDED.is_enabled,
    updated_at = NOW();

-- Premium Plan Features (all enabled)
INSERT INTO plan_features (plan_tier, feature_name, is_enabled) VALUES
('premium', 'dashboard', true),
('premium', 'financials', true),
('premium', 'compliance', true),
('premium', 'profile', true),
('premium', 'portfolio_fundraising', true),
('premium', 'grants_draft', true),
('premium', 'grants_add_to_crm', true),
('premium', 'investor_ai_matching', true),
('premium', 'investor_add_to_crm', true),
('premium', 'crm_access', true),
('premium', 'fundraising_active', true),
('premium', 'fund_utilization_report', true) -- Available in Standard and Premium
ON CONFLICT (plan_tier, feature_name) 
DO UPDATE SET 
    is_enabled = EXCLUDED.is_enabled,
    updated_at = NOW();

-- =====================================================
-- STEP 8: CREATE USER STORAGE USAGE TABLE
-- =====================================================

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

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_storage_user_id ON user_storage_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_user_storage_entity ON user_storage_usage(related_entity_type, related_entity_id);
CREATE INDEX IF NOT EXISTS idx_user_storage_created ON user_storage_usage(user_id, created_at DESC);

-- Add storage_used_mb column to user_subscriptions if it doesn't exist
ALTER TABLE user_subscriptions 
ADD COLUMN IF NOT EXISTS storage_used_mb DECIMAL(10,2) DEFAULT 0;

-- Create function to get user storage total
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

-- Create function to update subscription storage
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
-- STEP 9: INSERT DEFAULT COUNTRY PRICES
-- =====================================================

-- India prices
INSERT INTO country_plan_prices (country, plan_tier, price_inr, payment_gateway, is_active) VALUES
('India', 'free', 0.00, 'razorpay', true),
('India', 'basic', 2000.00, 'razorpay', true),
('India', 'premium', 8000.00, 'razorpay', true)
ON CONFLICT (country, plan_tier) 
DO UPDATE SET
    price_inr = EXCLUDED.price_inr,
    payment_gateway = EXCLUDED.payment_gateway,
    is_active = EXCLUDED.is_active,
    updated_at = NOW();

-- United States prices
INSERT INTO country_plan_prices (country, plan_tier, price_inr, payment_gateway, is_active) VALUES
('United States', 'free', 0.00, 'payaid', true),
('United States', 'basic', 2500.00, 'payaid', true),
('United States', 'premium', 10000.00, 'payaid', true)
ON CONFLICT (country, plan_tier) 
DO UPDATE SET
    price_inr = EXCLUDED.price_inr,
    payment_gateway = EXCLUDED.payment_gateway,
    is_active = EXCLUDED.is_active,
    updated_at = NOW();

-- United Kingdom prices
INSERT INTO country_plan_prices (country, plan_tier, price_inr, payment_gateway, is_active) VALUES
('United Kingdom', 'free', 0.00, 'payaid', true),
('United Kingdom', 'basic', 2200.00, 'payaid', true),
('United Kingdom', 'premium', 8800.00, 'payaid', true)
ON CONFLICT (country, plan_tier) 
DO UPDATE SET
    price_inr = EXCLUDED.price_inr,
    payment_gateway = EXCLUDED.payment_gateway,
    is_active = EXCLUDED.is_active,
    updated_at = NOW();

-- =====================================================
-- STEP 10: SET UP ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE country_plan_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_changes ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_storage_usage ENABLE ROW LEVEL SECURITY;

-- Country Plan Prices - Public read (for pricing display)
CREATE POLICY "Anyone can view country plan prices"
    ON country_plan_prices FOR SELECT
    USING (is_active = true);

-- Payment Transactions - Users see their own
DROP POLICY IF EXISTS "Users can view their own payment transactions" ON payment_transactions;
CREATE POLICY "Users can view their own payment transactions"
    ON payment_transactions FOR SELECT
    USING (auth.uid() = user_id);

-- Billing Cycles - Users see their own
DROP POLICY IF EXISTS "Users can view their own billing cycles" ON billing_cycles;
CREATE POLICY "Users can view their own billing cycles"
    ON billing_cycles FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM user_subscriptions
            WHERE user_subscriptions.id = billing_cycles.subscription_id
            AND user_subscriptions.user_id = auth.uid()
        )
    );

-- Subscription Changes - Users see their own
DROP POLICY IF EXISTS "Users can view their own subscription changes" ON subscription_changes;
CREATE POLICY "Users can view their own subscription changes"
    ON subscription_changes FOR SELECT
    USING (auth.uid() = user_id);

-- Plan Features - Public read (for feature checks)
CREATE POLICY "Anyone can view plan features"
    ON plan_features FOR SELECT
    USING (true);

-- User Storage Usage - Users see their own
DROP POLICY IF EXISTS "Users can view their own storage usage" ON user_storage_usage;
CREATE POLICY "Users can view their own storage usage"
    ON user_storage_usage FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own storage usage"
    ON user_storage_usage FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own storage usage"
    ON user_storage_usage FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own storage usage"
    ON user_storage_usage FOR DELETE
    USING (auth.uid() = user_id);

-- =====================================================
-- STEP 11: GRANT PERMISSIONS
-- =====================================================

-- Grant SELECT to authenticated users
GRANT SELECT ON country_plan_prices TO authenticated;
GRANT SELECT ON country_plan_prices TO anon;
GRANT SELECT ON payment_transactions TO authenticated;
GRANT SELECT ON billing_cycles TO authenticated;
GRANT SELECT ON subscription_changes TO authenticated;
GRANT SELECT ON plan_features TO authenticated;
GRANT SELECT ON plan_features TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON user_storage_usage TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_storage_total(UUID) TO authenticated;

-- =====================================================
-- STEP 12: VERIFICATION
-- =====================================================

-- Verify all tables exist
DO $$
DECLARE
    table_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO table_count
    FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name IN (
        'country_plan_prices',
        'payment_transactions',
        'billing_cycles',
        'subscription_changes',
        'plan_features',
        'user_storage_usage'
    );
    
    IF table_count = 6 THEN
        RAISE NOTICE '✅ All payment tables created successfully!';
    ELSE
        RAISE WARNING '⚠️ Only % out of 6 tables found', table_count;
    END IF;
END $$;

-- Verify country plan prices
SELECT 
    country,
    plan_tier,
    price_inr,
    payment_gateway,
    is_active
FROM country_plan_prices
ORDER BY country, 
    CASE plan_tier 
        WHEN 'free' THEN 1 
        WHEN 'basic' THEN 2 
        WHEN 'premium' THEN 3 
    END;

-- Verify user_subscriptions columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'user_subscriptions' 
AND column_name IN (
    'locked_amount_inr',
    'country',
    'payment_gateway',
    'autopay_enabled',
    'razorpay_mandate_id',
    'next_billing_date',
    'billing_cycle_count'
)
ORDER BY column_name;

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ PAYMENT SYSTEM TABLES CREATED!';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE 'Tables Created:';
    RAISE NOTICE '  ✓ country_plan_prices';
    RAISE NOTICE '  ✓ payment_transactions';
    RAISE NOTICE '  ✓ billing_cycles';
    RAISE NOTICE '  ✓ subscription_changes';
    RAISE NOTICE '  ✓ plan_features';
    RAISE NOTICE '  ✓ user_storage_usage';
    RAISE NOTICE '';
    RAISE NOTICE 'Tables Enhanced:';
    RAISE NOTICE '  ✓ subscription_plans (added plan_tier, storage_limit_mb, features)';
    RAISE NOTICE '  ✓ user_subscriptions (added payment columns, autopay, billing, storage_used_mb)';
    RAISE NOTICE '';
    RAISE NOTICE 'Default Data:';
    RAISE NOTICE '  ✓ India: Free ₹0, Basic ₹2000, Premium ₹8000 (Razorpay)';
    RAISE NOTICE '  ✓ United States: Free ₹0, Basic ₹2500, Premium ₹10000 (PayAid)';
    RAISE NOTICE '  ✓ United Kingdom: Free ₹0, Basic ₹2200, Premium ₹8800 (PayAid)';
    RAISE NOTICE '';
    RAISE NOTICE 'Security:';
    RAISE NOTICE '  ✓ RLS policies enabled';
    RAISE NOTICE '  ✓ Indexes created';
    RAISE NOTICE '';
    RAISE NOTICE 'Next Steps:';
    RAISE NOTICE '  1. Admin can add more countries in Financial Tab';
    RAISE NOTICE '  2. Frontend can now fetch country prices';
    RAISE NOTICE '  3. Payment processing can record transactions';
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
END $$;
