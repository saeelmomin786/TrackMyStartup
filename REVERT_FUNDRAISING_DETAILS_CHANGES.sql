-- REVERT: Restore original fundraising_details values
-- The original values were correct and set by startups themselves

-- 1. First, let's see what we changed (the wrong values)
SELECT 
    'current_wrong_values' as check_type,
    fd.startup_id,
    s.name as startup_name,
    fd.value as current_value,
    fd.equity as current_equity,
    fd.type as current_type
FROM fundraising_details fd
LEFT JOIN startups s ON fd.startup_id = s.id
ORDER BY fd.startup_id
LIMIT 10;

-- 2. We need to restore the original values
-- Since we don't have a backup, we'll need to set them back to the correct values
-- that were shown in the investor_view before our changes

-- Restore MULSETU AGROTECH (ID: 181)
UPDATE fundraising_details 
SET 
    value = 1000000.00,
    equity = 5.00,
    type = 'Pre-Seed'
WHERE startup_id = 181;

-- Restore Track My Startup (ID: 182)
UPDATE fundraising_details 
SET 
    value = 5000000.00,
    equity = 15.00,
    type = 'Pre-Seed'
WHERE startup_id = 182;

-- Restore Nido (ID: 184)
UPDATE fundraising_details 
SET 
    value = 1500000000.00,
    equity = 30.00,
    type = 'Series B'
WHERE startup_id = 184;

-- Restore Deepmouli Innovations (ID: 185)
UPDATE fundraising_details 
SET 
    value = 10000000.00,
    equity = 10.00,
    type = 'Pre-Seed'
WHERE startup_id = 185;

-- Restore Kyrmenlang Solutions (ID: 190)
UPDATE fundraising_details 
SET 
    value = 5000000.00,
    equity = 100.00,
    type = 'Pre-Seed'
WHERE startup_id = 190;

-- Restore Inviwise Accounting (ID: 191)
UPDATE fundraising_details 
SET 
    value = 12.38,
    equity = 10.00,
    type = 'Pre-Seed'
WHERE startup_id = 191;

-- Restore CASP AI Solutions (ID: 192)
UPDATE fundraising_details 
SET 
    value = 44130350.00,
    equity = 5.00,
    type = 'Seed'
WHERE startup_id = 192;

-- 3. Verify the restored values
SELECT 
    'restored_values' as check_type,
    fd.startup_id,
    s.name as startup_name,
    fd.value as restored_value,
    fd.equity as restored_equity,
    fd.type as restored_type,
    fd.active as is_active
FROM fundraising_details fd
LEFT JOIN startups s ON fd.startup_id = s.id
ORDER BY fd.startup_id
LIMIT 10;

-- 4. Show what investors will now see (should be back to original)
SELECT 
    'investor_view_restored' as check_type,
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



