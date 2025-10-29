-- Fix fundraising_details table to match realistic startup data
-- This is what investors actually see on the discover page

-- 1. First, check current fundraising_details data
SELECT 
    'current_fundraising_data' as check_type,
    fd.startup_id,
    s.name as startup_name,
    fd.value as current_fundraising_value,
    fd.equity as current_fundraising_equity,
    s.investment_value as startup_value,
    s.equity_allocation as startup_equity
FROM fundraising_details fd
LEFT JOIN startups s ON fd.startup_id = s.id
ORDER BY fd.startup_id
LIMIT 10;

-- 2. Update fundraising_details to match startups table values
UPDATE fundraising_details 
SET 
    value = s.investment_value,
    equity = s.equity_allocation,
    type = s.investment_type
FROM startups s
WHERE fundraising_details.startup_id = s.id;

-- 3. If fundraising_details doesn't have records for all startups, create them
INSERT INTO fundraising_details (
    startup_id,
    value,
    equity,
    type,
    active,
    created_at
)
SELECT 
    s.id,
    s.investment_value,
    s.equity_allocation,
    s.investment_type,
    true,  -- Set as active
    NOW()
FROM startups s
WHERE NOT EXISTS (
    SELECT 1 FROM fundraising_details fd WHERE fd.startup_id = s.id
);

-- 4. Verify the updated fundraising_details data
SELECT 
    'updated_fundraising_data' as check_type,
    fd.startup_id,
    s.name as startup_name,
    fd.value as fundraising_value,
    fd.equity as fundraising_equity,
    fd.type as fundraising_type,
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

-- 5. Show what investors will now see on discover page
SELECT 
    'investor_discover_view' as check_type,
    fd.startup_id,
    s.name as startup_name,
    fd.value as investment_value_shown,
    fd.equity as equity_allocation_shown,
    fd.type as investment_type_shown,
    fd.active as is_active
FROM fundraising_details fd
LEFT JOIN startups s ON fd.startup_id = s.id
WHERE fd.active = true
ORDER BY fd.startup_id
LIMIT 10;



