-- Create Subscription Plans with EUR Pricing (Global)
-- Free Plan: €0, Basic Plan: €5/month, Premium Plan: €20/month

-- =====================================================
-- STEP 1: UPDATE SUBSCRIPTION PLANS TABLE
-- =====================================================

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
-- STEP 2: INSERT/UPDATE GLOBAL SUBSCRIPTION PLANS (EUR)
-- =====================================================

-- Free Plan (Global - EUR)
INSERT INTO subscription_plans (
    name, 
    price, 
    currency, 
    interval, 
    description, 
    user_type, 
    country, 
    is_active,
    plan_tier,
    storage_limit_mb,
    features
) VALUES (
    'Free Plan - Startup',
    0.00,
    'EUR',
    'monthly',
    'Free plan with basic features - 100 MB storage',
    'Startup',
    'Global',
    true,
    'free',
    100,
    '{
        "portfolio_fundraising": false,
        "grants_draft": false,
        "grants_add_to_crm": false,
        "investor_ai_matching": false,
        "investor_add_to_crm": false,
        "crm_access": false,
        "fundraising_active": false
    }'::jsonb
)
ON CONFLICT (name, user_type, interval, country) 
DO UPDATE SET
    price = EXCLUDED.price,
    currency = EXCLUDED.currency,
    plan_tier = EXCLUDED.plan_tier,
    storage_limit_mb = EXCLUDED.storage_limit_mb,
    features = EXCLUDED.features,
    updated_at = NOW();

-- Basic Plan (Global - EUR) - €5/month
INSERT INTO subscription_plans (
    name, 
    price, 
    currency, 
    interval, 
    description, 
    user_type, 
    country, 
    is_active,
    plan_tier,
    storage_limit_mb,
    features
) VALUES (
    'Basic Plan - Startup',
    5.00,
    'EUR',
    'monthly',
    'Basic plan with portfolio fundraising, grants, and CRM - 1 GB storage',
    'Startup',
    'Global',
    true,
    'basic',
    1024, -- 1 GB
    '{
        "portfolio_fundraising": true,
        "grants_draft": true,
        "grants_add_to_crm": true,
        "investor_ai_matching": false,
        "investor_add_to_crm": false,
        "crm_access": true,
        "fundraising_active": false
    }'::jsonb
)
ON CONFLICT (name, user_type, interval, country) 
DO UPDATE SET
    price = EXCLUDED.price,
    currency = EXCLUDED.currency,
    plan_tier = EXCLUDED.plan_tier,
    storage_limit_mb = EXCLUDED.storage_limit_mb,
    features = EXCLUDED.features,
    updated_at = NOW();

-- Premium Plan (Global - EUR) - €20/month
INSERT INTO subscription_plans (
    name, 
    price, 
    currency, 
    interval, 
    description, 
    user_type, 
    country, 
    is_active,
    plan_tier,
    storage_limit_mb,
    features
) VALUES (
    'Premium Plan - Startup',
    20.00,
    'EUR',
    'monthly',
    'Premium plan with all features including active fundraising campaigns - 10 GB storage',
    'Startup',
    'Global',
    true,
    'premium',
    10240, -- 10 GB
    '{
        "portfolio_fundraising": true,
        "grants_draft": true,
        "grants_add_to_crm": true,
        "investor_ai_matching": true,
        "investor_add_to_crm": true,
        "crm_access": true,
        "fundraising_active": true
    }'::jsonb
)
ON CONFLICT (name, user_type, interval, country) 
DO UPDATE SET
    price = EXCLUDED.price,
    currency = EXCLUDED.currency,
    plan_tier = EXCLUDED.plan_tier,
    storage_limit_mb = EXCLUDED.storage_limit_mb,
    features = EXCLUDED.features,
    updated_at = NOW();

-- =====================================================
-- STEP 3: VERIFY PLANS CREATED
-- =====================================================

-- Verify that plans were created successfully
SELECT 
    id,
    name,
    price,
    currency,
    plan_tier,
    storage_limit_mb,
    interval,
    country,
    is_active,
    features
FROM subscription_plans 
WHERE user_type = 'Startup' 
AND country = 'Global'
AND is_active = true
ORDER BY 
    CASE plan_tier 
        WHEN 'free' THEN 1 
        WHEN 'basic' THEN 2 
        WHEN 'premium' THEN 3 
    END;

-- =====================================================
-- STEP 4: CREATE INDEXES FOR PERFORMANCE
-- =====================================================

-- Index for plan_tier lookups
CREATE INDEX IF NOT EXISTS idx_subscription_plans_tier 
ON subscription_plans(plan_tier) 
WHERE is_active = true;

-- Index for country and user_type lookups
CREATE INDEX IF NOT EXISTS idx_subscription_plans_country_user_type 
ON subscription_plans(country, user_type, is_active);

-- =====================================================
-- NOTES
-- =====================================================
-- 
-- Pricing Structure:
-- - Free Plan: €0/month (100 MB storage)
-- - Basic Plan: €5/month (1 GB storage)
-- - Premium Plan: €20/month (10 GB storage)
--
-- All plans are in EUR and set for Global (international) users
-- For Indian users, Razorpay will handle currency conversion if needed
-- For international users, PayAid will process EUR payments
--
-- Feature Access:
-- - Free: Basic dashboard features only
-- - Basic: All features except active fundraising campaigns
-- - Premium: All features included
--
-- =====================================================
