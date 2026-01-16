-- =====================================================
-- UPDATE INVESTOR FEATURES TO PREMIUM ONLY
-- =====================================================
-- This script updates the plan_features table to make
-- AI Investor Matching and Add to CRM Premium-only features
-- =====================================================

-- Update plan_features table for Basic/Standard Plan
-- Disable investor_ai_matching for basic plan
UPDATE plan_features
SET 
    is_enabled = false,
    updated_at = NOW()
WHERE plan_tier = 'basic'
  AND feature_name = 'investor_ai_matching';

-- Disable investor_add_to_crm for basic plan
UPDATE plan_features
SET 
    is_enabled = false,
    updated_at = NOW()
WHERE plan_tier = 'basic'
  AND feature_name = 'investor_add_to_crm';

-- Ensure these features are enabled for Premium (should already be true)
UPDATE plan_features
SET 
    is_enabled = true,
    updated_at = NOW()
WHERE plan_tier = 'premium'
  AND feature_name IN ('investor_ai_matching', 'investor_add_to_crm');

-- Update subscription_plans table features JSONB for Basic/Standard Plan
UPDATE subscription_plans
SET 
    features = jsonb_set(
        jsonb_set(
            features,
            '{investor_ai_matching}',
            'false'::jsonb
        ),
        '{investor_add_to_crm}',
        'false'::jsonb
    ),
    description = REPLACE(description, 'investor matching, and', 'and'),
    updated_at = NOW()
WHERE plan_tier = 'basic'
  AND (features->>'investor_ai_matching' = 'true' OR features->>'investor_add_to_crm' = 'true');

-- Ensure Premium plan has these features enabled
UPDATE subscription_plans
SET 
    features = jsonb_set(
        jsonb_set(
            features,
            '{investor_ai_matching}',
            'true'::jsonb
        ),
        '{investor_add_to_crm}',
        'true'::jsonb
    ),
    updated_at = NOW()
WHERE plan_tier = 'premium'
  AND (features->>'investor_ai_matching' = 'false' OR features->>'investor_add_to_crm' = 'false');

-- =====================================================
-- VERIFY CHANGES
-- =====================================================

-- Check plan_features table
SELECT 
    plan_tier,
    feature_name,
    is_enabled
FROM plan_features
WHERE feature_name IN ('investor_ai_matching', 'investor_add_to_crm')
ORDER BY plan_tier, feature_name;

-- Check subscription_plans table
SELECT 
    name,
    plan_tier,
    features->>'investor_ai_matching' as investor_ai_matching,
    features->>'investor_add_to_crm' as investor_add_to_crm
FROM subscription_plans
WHERE plan_tier IN ('basic', 'premium')
ORDER BY plan_tier;
