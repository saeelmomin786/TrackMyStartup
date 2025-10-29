-- Check fundraising_details table data
-- This is what the discover page actually shows to investors

-- 1. Check what's in fundraising_details table
SELECT 
    'fundraising_details_data' as check_type,
    id,
    startup_id,
    value as investment_value,
    equity as equity_allocation,
    type as investment_type,
    active,
    created_at
FROM fundraising_details
ORDER BY startup_id
LIMIT 10;

-- 2. Check if fundraising_details has data for our startups
SELECT 
    'fundraising_vs_startups' as check_type,
    fd.startup_id,
    s.name as startup_name,
    fd.value as fundraising_value,
    fd.equity as fundraising_equity,
    s.investment_value as startup_value,
    s.equity_allocation as startup_equity,
    CASE 
        WHEN fd.value = s.investment_value THEN 'MATCH'
        ELSE 'MISMATCH'
    END as value_match,
    CASE 
        WHEN fd.equity = s.equity_allocation THEN 'MATCH'
        ELSE 'MISMATCH'
    END as equity_match
FROM fundraising_details fd
LEFT JOIN startups s ON fd.startup_id = s.id
ORDER BY fd.startup_id
LIMIT 10;

-- 3. Check if fundraising_details is empty or has 0 values
SELECT 
    'fundraising_summary' as check_type,
    COUNT(*) as total_records,
    COUNT(CASE WHEN value = 0 THEN 1 END) as zero_value_records,
    COUNT(CASE WHEN equity = 0 THEN 1 END) as zero_equity_records,
    COUNT(CASE WHEN active = true THEN 1 END) as active_records
FROM fundraising_details;

-- 4. Show sample of what investors actually see
SELECT 
    'investor_view' as check_type,
    fd.startup_id,
    s.name as startup_name,
    fd.value as displayed_investment_value,
    fd.equity as displayed_equity_allocation,
    fd.type as displayed_investment_type,
    fd.active as is_active
FROM fundraising_details fd
LEFT JOIN startups s ON fd.startup_id = s.id
WHERE fd.active = true
ORDER BY fd.startup_id
LIMIT 10;



