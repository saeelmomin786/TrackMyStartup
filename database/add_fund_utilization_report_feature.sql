-- =====================================================
-- ADD FUND UTILIZATION REPORT FEATURE
-- =====================================================
-- This script adds the fund_utilization_report feature
-- Available in Standard and Premium plans, locked for Basic Plan
-- =====================================================

-- Add fund_utilization_report feature to plan_features table
INSERT INTO plan_features (plan_tier, feature_name, is_enabled) VALUES
('free', 'fund_utilization_report', false), -- Locked for Basic Plan
('basic', 'fund_utilization_report', true), -- Available in Standard Plan
('premium', 'fund_utilization_report', true) -- Available in Premium Plan
ON CONFLICT (plan_tier, feature_name) 
DO UPDATE SET 
    is_enabled = EXCLUDED.is_enabled,
    updated_at = NOW();

-- =====================================================
-- VERIFY CHANGES
-- =====================================================

-- Check fund_utilization_report feature status
SELECT 
    plan_tier,
    CASE plan_tier 
        WHEN 'free' THEN 'Basic Plan'
        WHEN 'basic' THEN 'Standard Plan'
        WHEN 'premium' THEN 'Premium Plan'
    END as plan_name,
    feature_name,
    CASE 
        WHEN is_enabled = true THEN '✅ UNLOCKED'
        WHEN is_enabled = false THEN '🔒 LOCKED'
    END as status
FROM plan_features
WHERE feature_name = 'fund_utilization_report'
ORDER BY 
    CASE plan_tier 
        WHEN 'free' THEN 1 
        WHEN 'basic' THEN 2 
        WHEN 'premium' THEN 3 
    END;
