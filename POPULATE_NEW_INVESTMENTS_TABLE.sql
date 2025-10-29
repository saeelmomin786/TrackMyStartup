-- Check and populate new_investments table
-- This script will ensure new_investments has the necessary data

-- 1. Check what's currently in new_investments table
SELECT 
    'new_investments_count' as check_type,
    COUNT(*) as total_records
FROM new_investments;

-- 2. Check what's in startups table
SELECT 
    'startups_count' as check_type,
    COUNT(*) as total_records
FROM startups;

-- 3. Show sample data from new_investments
SELECT 
    'new_investments_sample' as check_type,
    id,
    name,
    investment_type,
    investment_value,
    equity_allocation,
    sector
FROM new_investments
ORDER BY id
LIMIT 10;

-- 4. Show sample data from startups
SELECT 
    'startups_sample' as check_type,
    id,
    name,
    sector,
    registration_date
FROM startups
ORDER BY id
LIMIT 10;

-- 5. If new_investments is empty or missing data, populate it
-- This will create records in new_investments for each startup
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
    'Seed'::investment_type,
    1000000.00,  -- Default investment value
    10.00,        -- Default equity allocation
    COALESCE(s.sector, 'Technology'),
    0.00,         -- Default total funding
    0.00,         -- Default total revenue
    COALESCE(s.registration_date, CURRENT_DATE),
    'Pending'::compliance_status
FROM startups s
WHERE NOT EXISTS (
    SELECT 1 FROM new_investments ni WHERE ni.id = s.id
)
ON CONFLICT (id) DO NOTHING;

-- 6. Verify the data was inserted
SELECT 
    'after_insert_count' as check_type,
    COUNT(*) as total_records
FROM new_investments;

-- 7. Show the populated data
SELECT 
    'populated_data' as check_type,
    id,
    name,
    investment_type,
    investment_value,
    equity_allocation,
    sector
FROM new_investments
ORDER BY id
LIMIT 10;
