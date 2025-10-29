-- CORRECTED: Populate new_investments with REAL startup data
-- This script will use the actual investment values from startups table

-- 1. First, let's see what the real startup data looks like
SELECT 
    'real_startup_data' as check_type,
    id,
    name,
    investment_type,
    investment_value,
    equity_allocation,
    sector,
    total_funding,
    total_revenue,
    registration_date
FROM startups
ORDER BY id
LIMIT 10;

-- 2. Delete the incorrectly populated data
DELETE FROM new_investments WHERE investment_type = 'Seed' AND investment_value = 1000000.00;

-- 3. Populate with REAL startup data
INSERT INTO new_investments (
    id,
    name,
    investment_type,
    investment_value,
    equity_allocation,
    sector,
    total_funding,
    total_revenue,
    registration_date,
    compliance_status
)
SELECT 
    s.id,
    s.name,
    s.investment_type,
    s.investment_value,
    s.equity_allocation,
    s.sector,
    s.total_funding,
    s.total_revenue,
    s.registration_date,
    s.compliance_status
FROM startups s
WHERE NOT EXISTS (
    SELECT 1 FROM new_investments ni WHERE ni.id = s.id
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    investment_type = EXCLUDED.investment_type,
    investment_value = EXCLUDED.investment_value,
    equity_allocation = EXCLUDED.equity_allocation,
    sector = EXCLUDED.sector,
    total_funding = EXCLUDED.total_funding,
    total_revenue = EXCLUDED.total_revenue,
    registration_date = EXCLUDED.registration_date,
    compliance_status = EXCLUDED.compliance_status;

-- 4. Verify the corrected data
SELECT 
    'corrected_data' as check_type,
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

-- 5. Show comparison between startups and new_investments
SELECT 
    'comparison' as check_type,
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



