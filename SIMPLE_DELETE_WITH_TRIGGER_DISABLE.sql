-- =====================================================
-- SIMPLE DELETION WITH TRIGGER DISABLE
-- =====================================================
-- This is the simplest approach - disable triggers and delete
-- Run this in your Supabase SQL editor

-- =====================================================
-- STEP 1: DISABLE ALL TRIGGERS TEMPORARILY
-- =====================================================

-- Disable triggers that might cause constraint issues
ALTER TABLE founders DISABLE TRIGGER ALL;
ALTER TABLE investment_records DISABLE TRIGGER ALL;
ALTER TABLE equity_holdings DISABLE TRIGGER ALL;
ALTER TABLE startups DISABLE TRIGGER ALL;
ALTER TABLE startup_shares DISABLE TRIGGER ALL;
ALTER TABLE users DISABLE TRIGGER ALL;

-- =====================================================
-- STEP 2: DELETE TEST EMAILS
-- =====================================================

-- Delete test emails directly
DELETE FROM users 
WHERE email IN (
    'info1@startupnationindia.com',
    'sarveshgadkari.agri@gmail.com',
    'sid64527@gmail.com',
    'poojaawandkar04@gmail.com',
    'poojaawandkar24@gmail.com',
    'communication@startupnationindia.com',
    'olympiad_info2@startupnationindia.com'
);

-- =====================================================
-- STEP 3: RE-ENABLE TRIGGERS
-- =====================================================

-- Re-enable all triggers
ALTER TABLE founders ENABLE TRIGGER ALL;
ALTER TABLE investment_records ENABLE TRIGGER ALL;
ALTER TABLE equity_holdings ENABLE TRIGGER ALL;
ALTER TABLE startups ENABLE TRIGGER ALL;
ALTER TABLE startup_shares ENABLE TRIGGER ALL;
ALTER TABLE users ENABLE TRIGGER ALL;

-- =====================================================
-- STEP 4: VERIFICATION
-- =====================================================

-- Check if deletion was successful
SELECT 'Test emails after deletion:' as status, email, created_at 
FROM users 
WHERE email IN (
    'info1@startupnationindia.com',
    'sarveshgadkari.agri@gmail.com',
    'sid64527@gmail.com',
    'poojaawandkar04@gmail.com',
    'poojaawandkar24@gmail.com',
    'communication@startupnationindia.com',
    'olympiad_info2@startupnationindia.com'
);

-- Check for any startup_shares records with NULL price_per_share
SELECT 'Startup shares with NULL price_per_share:' as status, startup_id, total_shares, price_per_share
FROM startup_shares 
WHERE price_per_share IS NULL;


