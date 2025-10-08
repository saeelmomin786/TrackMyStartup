-- Update subscription plans for India only with new pricing
-- Monthly: Rs 299 + GST per month
-- Yearly: Rs 2,999 + GST per month (Rs 35,988 + GST per year)

-- =====================================================
-- STEP 1: DELETE ALL EXISTING STARTUP PLANS
-- =====================================================

-- Remove all existing startup plans
DELETE FROM subscription_plans 
WHERE user_type = 'Startup';

-- =====================================================
-- STEP 2: INSERT NEW INDIAN PLANS ONLY
-- =====================================================

-- Insert only Indian startup plans with new pricing
INSERT INTO subscription_plans (name, price, currency, interval, description, user_type, country, is_active) VALUES
-- Monthly Plan - India
('Startup Monthly Plan', 299.00, 'INR', 'monthly', 'Monthly subscription for startup users - Rs 299 + GST per month', 'Startup', 'India', true),

-- Yearly Plan - India  
('Startup Yearly Plan', 2999.00, 'INR', 'yearly', 'Yearly subscription for startup users - Rs 2,999 + GST per year', 'Startup', 'India', true);

-- =====================================================
-- STEP 3: UPDATE BILLING_INTERVAL COLUMN
-- =====================================================

-- Update billing_interval column to match interval
UPDATE subscription_plans 
SET billing_interval = interval 
WHERE user_type = 'Startup';

-- =====================================================
-- STEP 4: CREATE HELPFUL VIEWS
-- =====================================================

-- View for active startup subscription plans
CREATE OR REPLACE VIEW active_startup_plans AS
SELECT 
    id,
    name,
    price,
    currency,
    interval,
    billing_interval,
    description,
    country,
    CASE 
        WHEN interval = 'yearly' OR billing_interval = 'yearly' THEN 'Best Value - Save 2 months!'
        ELSE 'Flexible monthly billing'
    END as plan_benefit,
    CASE 
        WHEN interval = 'yearly' OR billing_interval = 'yearly' THEN ROUND(price / 12, 2)
        ELSE price
    END as monthly_equivalent
FROM subscription_plans 
WHERE user_type = 'Startup' 
AND is_active = true
ORDER BY COALESCE(interval, billing_interval), price;

-- =====================================================
-- STEP 5: VERIFY THE UPDATE
-- =====================================================

-- Check if plans were updated successfully
SELECT 
    'Updated Indian Plans' as check_type,
    COUNT(*) as total_plans,
    COUNT(CASE WHEN interval = 'monthly' THEN 1 END) as monthly_plans,
    COUNT(CASE WHEN interval = 'yearly' THEN 1 END) as yearly_plans
FROM subscription_plans 
WHERE user_type = 'Startup' AND is_active = true;

-- Show the updated plans
SELECT 
    'Indian Startup Plans' as info,
    name,
    price,
    currency,
    interval,
    country,
    CASE 
        WHEN interval = 'yearly' THEN ROUND(price / 12, 2)
        ELSE price
    END as monthly_equivalent
FROM subscription_plans 
WHERE user_type = 'Startup' AND is_active = true
ORDER BY interval, price;
