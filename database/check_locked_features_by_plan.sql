-- =====================================================
-- CHECK LOCKED FEATURES BY PLAN
-- =====================================================
-- This query shows which features are LOCKED (disabled) for each plan
-- =====================================================

-- Show all features and their lock status by plan
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
    END as status,
    is_enabled
FROM plan_features
ORDER BY 
    CASE plan_tier 
        WHEN 'free' THEN 1 
        WHEN 'basic' THEN 2 
        WHEN 'premium' THEN 3 
    END,
    feature_name;

-- =====================================================
-- SUMMARY: LOCKED FEATURES BY PLAN
-- =====================================================

-- Basic Plan (free tier) - LOCKED Features
SELECT 
    'Basic Plan (Free)' as plan,
    STRING_AGG(feature_name, ', ' ORDER BY feature_name) as locked_features,
    COUNT(*) as total_locked
FROM plan_features
WHERE plan_tier = 'free' 
  AND is_enabled = false;

-- Standard Plan (basic tier) - LOCKED Features
SELECT 
    'Standard Plan (Basic)' as plan,
    STRING_AGG(feature_name, ', ' ORDER BY feature_name) as locked_features,
    COUNT(*) as total_locked
FROM plan_features
WHERE plan_tier = 'basic' 
  AND is_enabled = false;

-- Premium Plan - LOCKED Features
SELECT 
    'Premium Plan' as plan,
    STRING_AGG(feature_name, ', ' ORDER BY feature_name) as locked_features,
    COUNT(*) as total_locked
FROM plan_features
WHERE plan_tier = 'premium' 
  AND is_enabled = false;

-- =====================================================
-- DETAILED BREAKDOWN BY FEATURE
-- =====================================================

-- Show which plans have each feature locked
SELECT 
    feature_name,
    MAX(CASE WHEN plan_tier = 'free' AND is_enabled = false THEN '🔒' ELSE '✅' END) as basic_plan,
    MAX(CASE WHEN plan_tier = 'basic' AND is_enabled = false THEN '🔒' ELSE '✅' END) as standard_plan,
    MAX(CASE WHEN plan_tier = 'premium' AND is_enabled = false THEN '🔒' ELSE '✅' END) as premium_plan
FROM plan_features
GROUP BY feature_name
ORDER BY feature_name;
