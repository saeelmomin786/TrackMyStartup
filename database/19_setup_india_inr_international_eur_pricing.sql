-- =====================================================
-- SETUP INDIA (ADMIN-CONFIGURABLE INR) + INTERNATIONAL (FIXED EUR)
-- =====================================================
-- This script sets up pricing structure:
-- - India: Admin sets prices in INR (displayed as EUR base)
-- - All other countries: Fixed EUR prices (€5 Basic, €20 Premium)
-- - Uses general_data table for country management (admin can add/delete)
-- Run this in Supabase SQL Editor
-- =====================================================

-- =====================================================
-- STEP 1: DROP CONSTRAINT FIRST (CRITICAL)
-- =====================================================

-- Drop the constraint FIRST so we can update invalid data
ALTER TABLE country_plan_prices 
DROP CONSTRAINT IF EXISTS country_plan_prices_payment_gateway_check;

-- =====================================================
-- STEP 2: ADD COLUMNS FIRST (BEFORE UPDATING)
-- =====================================================

-- Add base_price_eur column (fixed EUR base prices)
ALTER TABLE country_plan_prices 
ADD COLUMN IF NOT EXISTS base_price_eur DECIMAL(10,2);

-- Make price_inr nullable (international countries won't have INR)
ALTER TABLE country_plan_prices 
ALTER COLUMN price_inr DROP NOT NULL;

-- Add currency column to track which currency is used
ALTER TABLE country_plan_prices 
ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'INR';

-- Add is_admin_configurable flag (India = true, International = false)
ALTER TABLE country_plan_prices 
ADD COLUMN IF NOT EXISTS is_admin_configurable BOOLEAN DEFAULT false;

-- =====================================================
-- STEP 3: FIX EXISTING DATA (NOW SAFE TO UPDATE)
-- =====================================================

-- Now update ALL existing rows to have valid payment_gateway
-- This is safe now because constraint is dropped
UPDATE country_plan_prices 
SET payment_gateway = 'stripe'
WHERE payment_gateway NOT IN ('razorpay', 'stripe', 'paypal')
   OR payment_gateway IS NULL;

-- Update all non-India rows to have valid structure
UPDATE country_plan_prices 
SET 
    payment_gateway = 'stripe',
    currency = 'EUR'
WHERE country != 'India' 
   OR country IS NULL;

-- Ensure India rows have correct gateway and currency
UPDATE country_plan_prices 
SET 
    payment_gateway = 'razorpay',
    currency = 'INR'
WHERE country = 'India'
AND (payment_gateway != 'razorpay' OR currency != 'INR');

-- =====================================================
-- STEP 4: SET DEFAULT VALUES FOR EXISTING ROWS
-- =====================================================

-- Set default values for existing rows
UPDATE country_plan_prices 
SET 
    base_price_eur = COALESCE(base_price_eur, 
        CASE 
            WHEN plan_tier = 'free' THEN 0.00
            WHEN plan_tier = 'basic' THEN 5.00
            WHEN plan_tier = 'premium' THEN 20.00
            ELSE 0.00
        END),
    currency = COALESCE(currency, 
        CASE 
            WHEN country = 'India' THEN 'INR'
            ELSE 'EUR'
        END),
    is_admin_configurable = COALESCE(is_admin_configurable, 
        CASE 
            WHEN country = 'India' THEN true
            ELSE false
        END)
WHERE base_price_eur IS NULL 
   OR currency IS NULL 
   OR is_admin_configurable IS NULL;

-- =====================================================
-- STEP 5: RECREATE CONSTRAINT (NOW SAFE)
-- =====================================================

-- Now recreate the constraint - all data is valid
ALTER TABLE country_plan_prices 
ADD CONSTRAINT country_plan_prices_payment_gateway_check 
CHECK (payment_gateway IN ('razorpay', 'stripe', 'paypal'));

-- =====================================================
-- STEP 6: SET UP INDIA PRICING (ADMIN-CONFIGURABLE)
-- =====================================================

-- India: Admin can set INR prices, but base EUR is fixed
INSERT INTO country_plan_prices (
    country, 
    plan_tier, 
    base_price_eur, 
    price_inr, 
    payment_gateway, 
    currency,
    is_admin_configurable,
    is_active
) VALUES
-- Free Plan
('India', 'free', 0.00, 0.00, 'razorpay', 'INR', true, true),
-- Basic Plan: €5 base, admin sets INR (default ₹450, admin can change)
('India', 'basic', 5.00, 450.00, 'razorpay', 'INR', true, true),
-- Premium Plan: €20 base, admin sets INR (default ₹1800, admin can change)
('India', 'premium', 20.00, 1800.00, 'razorpay', 'INR', true, true)
ON CONFLICT (country, plan_tier) 
DO UPDATE SET
    base_price_eur = EXCLUDED.base_price_eur,
    price_inr = COALESCE(EXCLUDED.price_inr, country_plan_prices.price_inr), -- Keep existing if not provided
    payment_gateway = EXCLUDED.payment_gateway,
    currency = EXCLUDED.currency,
    is_admin_configurable = EXCLUDED.is_admin_configurable,
    updated_at = NOW();

-- =====================================================
-- STEP 7: DELETE OLD COUNTRY-SPECIFIC ROWS
-- =====================================================

-- Delete old country-specific rows (United States, United Kingdom, etc.)
-- We'll use a function to sync from general_data table instead
DELETE FROM country_plan_prices 
WHERE country != 'India' 
AND country != 'International';

-- =====================================================
-- STEP 8: SET UP INTERNATIONAL PRICING (FIXED EUR)
-- =====================================================

-- International/Global: Fixed EUR prices (€5, €20)
-- Admin cannot change these, they are fixed
-- This is the default for all non-India countries
INSERT INTO country_plan_prices (
    country, 
    plan_tier, 
    base_price_eur, 
    price_inr, 
    payment_gateway, 
    currency,
    is_admin_configurable,
    is_active
) VALUES
-- Free Plan
('International', 'free', 0.00, NULL, 'stripe', 'EUR', false, true),
-- Basic Plan: Fixed €5 (admin cannot change)
('International', 'basic', 5.00, NULL, 'stripe', 'EUR', false, true),
-- Premium Plan: Fixed €20 (admin cannot change)
('International', 'premium', 20.00, NULL, 'stripe', 'EUR', false, true)
ON CONFLICT (country, plan_tier) 
DO UPDATE SET
    base_price_eur = EXCLUDED.base_price_eur,
    price_inr = NULL, -- International doesn't use INR
    payment_gateway = EXCLUDED.payment_gateway,
    currency = EXCLUDED.currency,
    is_admin_configurable = false, -- Always false for international
    updated_at = NOW();

-- =====================================================
-- STEP 9: CREATE FUNCTION TO SYNC COUNTRIES FROM general_data
-- =====================================================

-- Function to sync countries from general_data to country_plan_prices
-- This ensures when admin adds/deletes countries, pricing is handled automatically
CREATE OR REPLACE FUNCTION sync_countries_to_pricing()
RETURNS void AS $$
DECLARE
    country_record RECORD;
BEGIN
    -- Loop through all active countries in general_data
    FOR country_record IN 
        SELECT name 
        FROM general_data 
        WHERE category = 'country' 
        AND is_active = true
        AND name != 'India'  -- India is handled separately
    LOOP
        -- Insert/update pricing for each country using International pricing
        INSERT INTO country_plan_prices (
            country, 
            plan_tier, 
            base_price_eur, 
            price_inr, 
            payment_gateway, 
            currency,
            is_admin_configurable,
            is_active
        ) VALUES
        (country_record.name, 'free', 0.00, NULL, 'stripe', 'EUR', false, true),
        (country_record.name, 'basic', 5.00, NULL, 'stripe', 'EUR', false, true),
        (country_record.name, 'premium', 20.00, NULL, 'stripe', 'EUR', false, true)
        ON CONFLICT (country, plan_tier) 
        DO UPDATE SET
            base_price_eur = EXCLUDED.base_price_eur,
            payment_gateway = EXCLUDED.payment_gateway,
            currency = EXCLUDED.currency,
            is_admin_configurable = false,
            is_active = true,  -- Reactivate if it was deactivated
            updated_at = NOW();
    END LOOP;
    
    -- Remove pricing for countries that are no longer in general_data or are inactive
    DELETE FROM country_plan_prices 
    WHERE country != 'India' 
    AND country != 'International'
    AND NOT EXISTS (
        SELECT 1 
        FROM general_data 
        WHERE category = 'country' 
        AND name = country_plan_prices.country 
        AND is_active = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION sync_countries_to_pricing() TO authenticated;

-- =====================================================
-- STEP 10: CREATE TRIGGER TO AUTO-SYNC WHEN COUNTRIES CHANGE
-- =====================================================

-- Function to trigger on general_data changes
CREATE OR REPLACE FUNCTION trigger_sync_countries_pricing()
RETURNS TRIGGER AS $$
BEGIN
    -- Only sync if it's a country category change
    IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') AND NEW.category = 'country' THEN
        PERFORM sync_countries_to_pricing();
    ELSIF TG_OP = 'DELETE' AND OLD.category = 'country' THEN
        PERFORM sync_countries_to_pricing();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on general_data table
DROP TRIGGER IF EXISTS sync_countries_pricing_trigger ON general_data;
CREATE TRIGGER sync_countries_pricing_trigger
    AFTER INSERT OR UPDATE OR DELETE ON general_data
    FOR EACH ROW
    EXECUTE FUNCTION trigger_sync_countries_pricing();

-- =====================================================
-- STEP 11: INITIAL SYNC OF COUNTRIES
-- =====================================================

-- Sync all existing countries from general_data to pricing
-- This creates pricing entries for all countries admin has added
SELECT sync_countries_to_pricing();

-- =====================================================
-- STEP 12: UPDATE USER_SUBSCRIPTIONS FOR PRICING REFERENCE
-- =====================================================

-- Add base_price_eur to user_subscriptions (what user saw)
ALTER TABLE user_subscriptions 
ADD COLUMN IF NOT EXISTS base_price_eur DECIMAL(10,2);

-- Ensure locked_amount_inr exists (what was actually charged)
ALTER TABLE user_subscriptions 
ADD COLUMN IF NOT EXISTS locked_amount_inr DECIMAL(10,2);

-- Add currency column
ALTER TABLE user_subscriptions 
ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'INR';

-- =====================================================
-- STEP 13: CREATE HELPER FUNCTION TO GET PRICE
-- =====================================================

-- Function to get price for a country and plan tier
CREATE OR REPLACE FUNCTION get_country_plan_price(
    p_country VARCHAR(100),
    p_plan_tier VARCHAR(20)
)
RETURNS TABLE (
    base_price_eur DECIMAL(10,2),
    price_inr DECIMAL(10,2),
    price_eur DECIMAL(10,2),
    currency VARCHAR(3),
    payment_gateway VARCHAR(20),
    is_admin_configurable BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        cpp.base_price_eur,
        cpp.price_inr,
        -- For India: return base_price_eur (for display)
        -- For International: return base_price_eur
        cpp.base_price_eur as price_eur,
        cpp.currency,
        cpp.payment_gateway,
        cpp.is_admin_configurable
    FROM country_plan_prices cpp
    WHERE cpp.country = p_country
    AND cpp.plan_tier = p_plan_tier
    AND cpp.is_active = true
    LIMIT 1;
    
    -- If country not found, return International pricing
    IF NOT FOUND THEN
        RETURN QUERY
        SELECT 
            cpp.base_price_eur,
            cpp.price_inr,
            cpp.base_price_eur as price_eur,
            cpp.currency,
            cpp.payment_gateway,
            cpp.is_admin_configurable
        FROM country_plan_prices cpp
        WHERE cpp.country = 'International'
        AND cpp.plan_tier = p_plan_tier
        AND cpp.is_active = true
        LIMIT 1;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_country_plan_price(VARCHAR, VARCHAR) TO authenticated;
GRANT EXECUTE ON FUNCTION get_country_plan_price(VARCHAR, VARCHAR) TO anon;

-- =====================================================
-- STEP 14: CREATE FUNCTION FOR ADMIN TO UPDATE INDIA PRICES
-- =====================================================

-- Function for admin to update India INR prices
CREATE OR REPLACE FUNCTION update_india_price(
    p_plan_tier VARCHAR(20),
    p_price_inr DECIMAL(10,2)
)
RETURNS BOOLEAN AS $$
BEGIN
    -- Only allow updating India prices
    UPDATE country_plan_prices
    SET 
        price_inr = p_price_inr,
        updated_at = NOW()
    WHERE country = 'India'
    AND plan_tier = p_plan_tier
    AND is_admin_configurable = true;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission (admin only - add RLS policy later)
GRANT EXECUTE ON FUNCTION update_india_price(VARCHAR, DECIMAL) TO authenticated;

-- =====================================================
-- STEP 15: GRANT PERMISSIONS
-- =====================================================

-- Allow authenticated users to read prices
GRANT SELECT ON country_plan_prices TO authenticated;
GRANT SELECT ON country_plan_prices TO anon;

-- =====================================================
-- STEP 16: VERIFY SETUP
-- =====================================================

-- Verify India pricing (admin-configurable)
SELECT 
    country,
    plan_tier,
    base_price_eur,
    price_inr,
    currency,
    payment_gateway,
    is_admin_configurable,
    is_active
FROM country_plan_prices
WHERE country = 'India'
ORDER BY 
    CASE plan_tier 
        WHEN 'free' THEN 1 
        WHEN 'basic' THEN 2 
        WHEN 'premium' THEN 3 
    END;

-- Verify International pricing (fixed EUR)
SELECT 
    country,
    plan_tier,
    base_price_eur,
    price_inr,
    currency,
    payment_gateway,
    is_admin_configurable,
    is_active
FROM country_plan_prices
WHERE country = 'International'
ORDER BY 
    CASE plan_tier 
        WHEN 'free' THEN 1 
        WHEN 'basic' THEN 2 
        WHEN 'premium' THEN 3 
    END;

-- Verify synced countries from general_data
SELECT 
    cpp.country,
    COUNT(*) as plan_count,
    MAX(cpp.payment_gateway) as gateway,
    MAX(cpp.currency) as currency
FROM country_plan_prices cpp
WHERE cpp.country != 'India' 
AND cpp.country != 'International'
GROUP BY cpp.country
ORDER BY cpp.country;

-- Test the helper function
SELECT * FROM get_country_plan_price('India', 'basic');
SELECT * FROM get_country_plan_price('United States', 'basic'); -- Should return International pricing if not synced yet

-- =====================================================
-- STEP 17: SUCCESS MESSAGE
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ PRICING STRUCTURE SETUP COMPLETE!';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE 'India Pricing (Admin-Configurable):';
    RAISE NOTICE '  ✓ Free: €0 = ₹0';
    RAISE NOTICE '  ✓ Basic: €5 = ₹450 (admin can change)';
    RAISE NOTICE '  ✓ Premium: €20 = ₹1800 (admin can change)';
    RAISE NOTICE '';
    RAISE NOTICE 'International Pricing (Fixed EUR):';
    RAISE NOTICE '  ✓ Free: €0';
    RAISE NOTICE '  ✓ Basic: €5 (fixed, cannot change)';
    RAISE NOTICE '  ✓ Premium: €20 (fixed, cannot change)';
    RAISE NOTICE '';
    RAISE NOTICE 'Country Management:';
    RAISE NOTICE '  ✓ Uses general_data table for countries';
    RAISE NOTICE '  ✓ Admin can add/delete countries in admin dashboard';
    RAISE NOTICE '  ✓ Pricing auto-syncs when countries are added/deleted';
    RAISE NOTICE '  ✓ All non-India countries use International EUR pricing';
    RAISE NOTICE '';
    RAISE NOTICE 'How It Works:';
    RAISE NOTICE '  1. Frontend always displays EUR (€5, €20)';
    RAISE NOTICE '  2. India: Admin sets INR equivalent in admin dashboard';
    RAISE NOTICE '  3. India: Razorpay charges admin-set INR amount';
    RAISE NOTICE '  4. International: Fixed EUR prices, no admin changes';
    RAISE NOTICE '  5. Countries from general_data auto-sync to pricing';
    RAISE NOTICE '';
    RAISE NOTICE 'Next Steps:';
    RAISE NOTICE '  1. Build admin dashboard to update India prices';
    RAISE NOTICE '  2. Update frontend to always show EUR';
    RAISE NOTICE '  3. Update payment flow to use INR for India';
    RAISE NOTICE '  4. Countries in general_data will auto-sync pricing';
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
END $$;
