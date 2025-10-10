-- Add Tax Columns to Existing Tables
-- This script adds tax-related columns to existing tables

-- =====================================================
-- STEP 1: ADD TAX COLUMNS TO SUBSCRIPTION_PLANS TABLE
-- =====================================================

-- Add tax_percentage column to subscription_plans table
ALTER TABLE subscription_plans 
ADD COLUMN IF NOT EXISTS tax_percentage DECIMAL(5,2) DEFAULT 0.00;

-- =====================================================
-- STEP 2: ADD TAX COLUMNS TO USER_SUBSCRIPTIONS TABLE
-- =====================================================

-- Add tax columns to user_subscriptions table
ALTER TABLE user_subscriptions 
ADD COLUMN IF NOT EXISTS tax_percentage DECIMAL(5,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS tax_amount DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS total_amount_with_tax DECIMAL(10,2) DEFAULT 0.00;

-- =====================================================
-- STEP 3: ADD TAX COLUMNS TO PAYMENTS TABLE
-- =====================================================

-- Add tax columns to payments table
ALTER TABLE payments 
ADD COLUMN IF NOT EXISTS tax_percentage DECIMAL(5,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS tax_amount DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS total_amount_with_tax DECIMAL(10,2) DEFAULT 0.00;

-- =====================================================
-- STEP 4: CREATE TAX CALCULATION FUNCTION
-- =====================================================

-- Function to calculate tax amount
CREATE OR REPLACE FUNCTION calculate_tax_amount(
    base_amount DECIMAL(10,2),
    tax_percentage DECIMAL(5,2)
)
RETURNS DECIMAL(10,2)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN ROUND((base_amount * tax_percentage / 100), 2);
END;
$$;

-- =====================================================
-- STEP 5: VERIFICATION QUERIES
-- =====================================================

-- Verify columns were added successfully
SELECT 'subscription_plans columns:' as table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'subscription_plans' 
AND column_name LIKE '%tax%';

SELECT 'user_subscriptions columns:' as table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'user_subscriptions' 
AND column_name LIKE '%tax%';

SELECT 'payments columns:' as table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'payments' 
AND column_name LIKE '%tax%';

-- Test tax calculation function
SELECT 'Tax calculation test:' as test, calculate_tax_amount(100.00, 18.00) as tax_amount, 118.00 as expected_total;

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================

SELECT 'Tax columns added successfully!' as status;
