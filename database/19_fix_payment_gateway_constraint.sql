-- =====================================================
-- QUICK FIX: Update existing payment_gateway values
-- =====================================================
-- Run this FIRST if you get constraint violation error
-- Then run the main script: 19_setup_india_inr_international_eur_pricing.sql
-- =====================================================

-- Check what payment_gateway values exist
SELECT DISTINCT payment_gateway, COUNT(*) 
FROM country_plan_prices 
GROUP BY payment_gateway;

-- Update 'payaid' to 'stripe'
UPDATE country_plan_prices 
SET payment_gateway = 'stripe'
WHERE payment_gateway = 'payaid';

-- Update any other invalid values to 'stripe'
UPDATE country_plan_prices 
SET payment_gateway = 'stripe'
WHERE payment_gateway NOT IN ('razorpay', 'stripe', 'paypal');

-- Verify all values are now valid
SELECT DISTINCT payment_gateway, COUNT(*) 
FROM country_plan_prices 
GROUP BY payment_gateway;

-- Now you can run the main script without constraint errors!
