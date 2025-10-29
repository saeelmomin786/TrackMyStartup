-- Check and populate startups table with realistic investment data
-- The issue is that startups table itself has 0.00 values

-- 1. Check current startup data
SELECT 
    'current_startup_data' as check_type,
    id,
    name,
    investment_type,
    investment_value,
    equity_allocation,
    current_valuation,
    sector,
    total_funding,
    total_revenue
FROM startups
ORDER BY id
LIMIT 10;

-- 2. Update startups with realistic investment data based on sector and stage
-- This will give each startup realistic investment values

-- Agriculture startups (like MULSETU AGROTECH)
UPDATE startups 
SET 
    investment_type = 'Seed',
    investment_value = 1500000.00,
    equity_allocation = 12.00,
    current_valuation = 12500000.00,
    total_funding = 0.00,
    total_revenue = 0.00
WHERE name ILIKE '%AGRO%' OR name ILIKE '%agriculture%' OR sector ILIKE '%agriculture%';

-- Technology startups
UPDATE startups 
SET 
    investment_type = 'Seed',
    investment_value = 2000000.00,
    equity_allocation = 15.00,
    current_valuation = 13333333.00,
    total_funding = 0.00,
    total_revenue = 0.00
WHERE sector ILIKE '%technology%' OR sector ILIKE '%tech%';

-- Healthcare startups
UPDATE startups 
SET 
    investment_type = 'Seed',
    investment_value = 2500000.00,
    equity_allocation = 18.00,
    current_valuation = 13888889.00,
    total_funding = 0.00,
    total_revenue = 0.00
WHERE sector ILIKE '%healthcare%' OR sector ILIKE '%health%' OR sector ILIKE '%medical%';

-- Finance startups
UPDATE startups 
SET 
    investment_type = 'Seed',
    investment_value = 1800000.00,
    equity_allocation = 14.00,
    current_valuation = 12857143.00,
    total_funding = 0.00,
    total_revenue = 0.00
WHERE sector ILIKE '%finance%' OR sector ILIKE '%fintech%';

-- Retail startups
UPDATE startups 
SET 
    investment_type = 'Seed',
    investment_value = 1200000.00,
    equity_allocation = 10.00,
    current_valuation = 12000000.00,
    total_funding = 0.00,
    total_revenue = 0.00
WHERE sector ILIKE '%retail%' OR sector ILIKE '%ecommerce%';

-- SaaS startups
UPDATE startups 
SET 
    investment_type = 'Seed',
    investment_value = 3000000.00,
    equity_allocation = 20.00,
    current_valuation = 15000000.00,
    total_funding = 0.00,
    total_revenue = 0.00
WHERE sector ILIKE '%saas%' OR sector ILIKE '%software%';

-- Food & Beverage startups
UPDATE startups 
SET 
    investment_type = 'Seed',
    investment_value = 1000000.00,
    equity_allocation = 8.00,
    current_valuation = 12500000.00,
    total_funding = 0.00,
    total_revenue = 0.00
WHERE sector ILIKE '%food%' OR sector ILIKE '%beverage%' OR sector ILIKE '%superfood%';

-- Others (default)
UPDATE startups 
SET 
    investment_type = 'Seed',
    investment_value = 1500000.00,
    equity_allocation = 12.00,
    current_valuation = 12500000.00,
    total_funding = 0.00,
    total_revenue = 0.00
WHERE investment_value = 0.00;

-- 3. Verify the updated startup data
SELECT 
    'updated_startup_data' as check_type,
    id,
    name,
    investment_type,
    investment_value,
    equity_allocation,
    current_valuation,
    sector,
    total_funding,
    total_revenue
FROM startups
ORDER BY id
LIMIT 10;

-- 4. Now update new_investments with the corrected startup data
UPDATE new_investments 
SET 
    investment_type = s.investment_type,
    investment_value = s.investment_value,
    equity_allocation = s.equity_allocation,
    sector = s.sector,
    total_funding = s.total_funding,
    total_revenue = s.total_revenue,
    registration_date = s.registration_date,
    compliance_status = s.compliance_status
FROM startups s
WHERE new_investments.id = s.id;

-- 5. Verify the final corrected data
SELECT 
    'final_corrected_data' as check_type,
    id,
    name,
    investment_type,
    investment_value,
    equity_allocation,
    sector,
    total_funding,
    total_revenue
FROM new_investments
ORDER BY id
LIMIT 10;

-- 6. Show final comparison
SELECT 
    'final_comparison' as check_type,
    s.id,
    s.name as startup_name,
    s.investment_value as startup_investment_value,
    s.equity_allocation as startup_equity_allocation,
    ni.investment_value as new_investment_value,
    ni.equity_allocation as new_investment_equity_allocation,
    CASE 
        WHEN s.investment_value = ni.investment_value THEN 'MATCH'
        ELSE 'MISMATCH'
    END as investment_value_match,
    CASE 
        WHEN s.equity_allocation = ni.equity_allocation THEN 'MATCH'
        ELSE 'MISMATCH'
    END as equity_allocation_match
FROM startups s
LEFT JOIN new_investments ni ON s.id = ni.id
ORDER BY s.id
LIMIT 10;



