-- =====================================================
-- VERIFY ALL FEATURES BY PLAN
-- =====================================================
-- This query shows which features are locked/unlocked for each plan
-- =====================================================

-- Detailed view: All features with status for each plan
SELECT 
    feature_name,
    CASE 
        WHEN feature_name = 'dashboard' THEN 'Dashboard Access'
        WHEN feature_name = 'financials' THEN 'Financial Tracking'
        WHEN feature_name = 'compliance' THEN 'Compliance Management'
        WHEN feature_name = 'profile' THEN 'Profile Management'
        WHEN feature_name = 'portfolio_fundraising' THEN 'Portfolio Fundraising'
        WHEN feature_name = 'grants_draft' THEN 'Grants Draft Assistant'
        WHEN feature_name = 'grants_add_to_crm' THEN 'Grant CRM'
        WHEN feature_name = 'investor_ai_matching' THEN 'AI Investor Matching'
        WHEN feature_name = 'investor_add_to_crm' THEN 'Investor CRM'
        WHEN feature_name = 'crm_access' THEN 'CRM Access'
        WHEN feature_name = 'fundraising_active' THEN 'Active Fundraising'
        WHEN feature_name = 'fund_utilization_report' THEN 'Fund Utilization Report'
        ELSE feature_name
    END as feature_display_name,
    MAX(CASE WHEN plan_tier = 'free' THEN 
        CASE WHEN is_enabled THEN '✅ UNLOCKED' ELSE '🔒 LOCKED' END 
    END) as basic_plan_status,
    MAX(CASE WHEN plan_tier = 'basic' THEN 
        CASE WHEN is_enabled THEN '✅ UNLOCKED' ELSE '🔒 LOCKED' END 
    END) as standard_plan_status,
    MAX(CASE WHEN plan_tier = 'premium' THEN 
        CASE WHEN is_enabled THEN '✅ UNLOCKED' ELSE '🔒 LOCKED' END 
    END) as premium_plan_status
FROM plan_features
GROUP BY feature_name
ORDER BY feature_name;

-- =====================================================
-- SUMMARY BY PLAN
-- =====================================================

-- Summary: Count of locked/unlocked features per plan
SELECT 
    CASE plan_tier 
        WHEN 'free' THEN 'Basic Plan'
        WHEN 'basic' THEN 'Standard Plan'
        WHEN 'premium' THEN 'Premium Plan'
    END as plan_name,
    COUNT(*) as total_features,
    COUNT(*) FILTER (WHERE is_enabled = true) as unlocked_features,
    COUNT(*) FILTER (WHERE is_enabled = false) as locked_features,
    ROUND(100.0 * COUNT(*) FILTER (WHERE is_enabled = true) / COUNT(*), 1) as unlock_percentage
FROM plan_features
GROUP BY plan_tier
ORDER BY 
    CASE plan_tier 
        WHEN 'free' THEN 1 
        WHEN 'basic' THEN 2 
        WHEN 'premium' THEN 3 
    END;

-- =====================================================
-- LOCKED FEATURES BY PLAN
-- =====================================================

-- Show only locked features for each plan
SELECT 
    CASE plan_tier 
        WHEN 'free' THEN 'Basic Plan'
        WHEN 'basic' THEN 'Standard Plan'
        WHEN 'premium' THEN 'Premium Plan'
    END as plan_name,
    feature_name,
    CASE 
        WHEN feature_name = 'dashboard' THEN 'Dashboard Access'
        WHEN feature_name = 'financials' THEN 'Financial Tracking'
        WHEN feature_name = 'compliance' THEN 'Compliance Management'
        WHEN feature_name = 'profile' THEN 'Profile Management'
        WHEN feature_name = 'portfolio_fundraising' THEN 'Portfolio Fundraising'
        WHEN feature_name = 'grants_draft' THEN 'Grants Draft Assistant'
        WHEN feature_name = 'grants_add_to_crm' THEN 'Grant CRM'
        WHEN feature_name = 'investor_ai_matching' THEN 'AI Investor Matching'
        WHEN feature_name = 'investor_add_to_crm' THEN 'Investor CRM'
        WHEN feature_name = 'crm_access' THEN 'CRM Access'
        WHEN feature_name = 'fundraising_active' THEN 'Active Fundraising'
        WHEN feature_name = 'fund_utilization_report' THEN 'Fund Utilization Report'
        ELSE feature_name
    END as feature_display_name
FROM plan_features
WHERE is_enabled = false
ORDER BY 
    CASE plan_tier 
        WHEN 'free' THEN 1 
        WHEN 'basic' THEN 2 
        WHEN 'premium' THEN 3 
    END,
    feature_name;

-- =====================================================
-- UNLOCKED FEATURES BY PLAN
-- =====================================================

-- Show only unlocked features for each plan
SELECT 
    CASE plan_tier 
        WHEN 'free' THEN 'Basic Plan'
        WHEN 'basic' THEN 'Standard Plan'
        WHEN 'premium' THEN 'Premium Plan'
    END as plan_name,
    feature_name,
    CASE 
        WHEN feature_name = 'dashboard' THEN 'Dashboard Access'
        WHEN feature_name = 'financials' THEN 'Financial Tracking'
        WHEN feature_name = 'compliance' THEN 'Compliance Management'
        WHEN feature_name = 'profile' THEN 'Profile Management'
        WHEN feature_name = 'portfolio_fundraising' THEN 'Portfolio Fundraising'
        WHEN feature_name = 'grants_draft' THEN 'Grants Draft Assistant'
        WHEN feature_name = 'grants_add_to_crm' THEN 'Grant CRM'
        WHEN feature_name = 'investor_ai_matching' THEN 'AI Investor Matching'
        WHEN feature_name = 'investor_add_to_crm' THEN 'Investor CRM'
        WHEN feature_name = 'crm_access' THEN 'CRM Access'
        WHEN feature_name = 'fundraising_active' THEN 'Active Fundraising'
        WHEN feature_name = 'fund_utilization_report' THEN 'Fund Utilization Report'
        ELSE feature_name
    END as feature_display_name
FROM plan_features
WHERE is_enabled = true
ORDER BY 
    CASE plan_tier 
        WHEN 'free' THEN 1 
        WHEN 'basic' THEN 2 
        WHEN 'premium' THEN 3 
    END,
    feature_name;

-- =====================================================
-- FEATURE COMPARISON TABLE (SPREADSHEET VIEW)
-- =====================================================

-- Table format showing all features across all plans
SELECT 
    feature_name as "Feature",
    CASE 
        WHEN feature_name = 'dashboard' THEN 'Dashboard Access'
        WHEN feature_name = 'financials' THEN 'Financial Tracking'
        WHEN feature_name = 'compliance' THEN 'Compliance Management'
        WHEN feature_name = 'profile' THEN 'Profile Management'
        WHEN feature_name = 'portfolio_fundraising' THEN 'Portfolio Fundraising'
        WHEN feature_name = 'grants_draft' THEN 'Grants Draft Assistant'
        WHEN feature_name = 'grants_add_to_crm' THEN 'Grant CRM'
        WHEN feature_name = 'investor_ai_matching' THEN 'AI Investor Matching'
        WHEN feature_name = 'investor_add_to_crm' THEN 'Investor CRM'
        WHEN feature_name = 'crm_access' THEN 'CRM Access'
        WHEN feature_name = 'fundraising_active' THEN 'Active Fundraising'
        WHEN feature_name = 'fund_utilization_report' THEN 'Fund Utilization Report'
        ELSE feature_name
    END as "Display Name",
    MAX(CASE WHEN plan_tier = 'free' THEN is_enabled END) as "Basic Plan",
    MAX(CASE WHEN plan_tier = 'basic' THEN is_enabled END) as "Standard Plan",
    MAX(CASE WHEN plan_tier = 'premium' THEN is_enabled END) as "Premium Plan"
FROM plan_features
GROUP BY feature_name
ORDER BY feature_name;
