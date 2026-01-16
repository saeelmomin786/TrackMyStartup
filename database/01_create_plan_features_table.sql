-- =====================================================
-- CREATE PLAN FEATURES TABLE
-- =====================================================
-- This table defines which features are enabled for each plan tier

CREATE TABLE IF NOT EXISTS plan_features (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_tier VARCHAR(20) NOT NULL CHECK (plan_tier IN ('free', 'basic', 'premium')),
    feature_name VARCHAR(100) NOT NULL,
    is_enabled BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(plan_tier, feature_name)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_plan_features_tier ON plan_features(plan_tier);
CREATE INDEX IF NOT EXISTS idx_plan_features_feature ON plan_features(feature_name);
CREATE INDEX IF NOT EXISTS idx_plan_features_enabled ON plan_features(plan_tier, is_enabled) WHERE is_enabled = true;

-- =====================================================
-- INSERT FEATURE ACCESS RULES
-- =====================================================

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
-- GRANT PERMISSIONS
-- =====================================================

GRANT SELECT ON plan_features TO authenticated;
GRANT SELECT ON plan_features TO anon;

-- =====================================================
-- VERIFY DATA
-- =====================================================

-- Check that all features are configured
SELECT 
    plan_tier,
    COUNT(*) as total_features,
    COUNT(*) FILTER (WHERE is_enabled = true) as enabled_features,
    COUNT(*) FILTER (WHERE is_enabled = false) as disabled_features
FROM plan_features
GROUP BY plan_tier
ORDER BY 
    CASE plan_tier 
        WHEN 'free' THEN 1 
        WHEN 'basic' THEN 2 
        WHEN 'premium' THEN 3 
    END;
