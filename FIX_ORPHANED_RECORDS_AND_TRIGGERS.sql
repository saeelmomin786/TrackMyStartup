-- =====================================================
-- FIX ORPHANED RECORDS AND TRIGGERS
-- =====================================================
-- This script first cleans up orphaned records, then fixes the triggers
-- Run this in your Supabase SQL editor

-- =====================================================
-- STEP 1: INVESTIGATE ORPHANED RECORDS
-- =====================================================

-- Check for orphaned founder records
SELECT 'Orphaned founder records:' as status, 
       COUNT(*) as count,
       'Founders referencing non-existent startups' as description
FROM founders f
LEFT JOIN startups s ON f.startup_id = s.id
WHERE s.id IS NULL;

-- Check for orphaned investment records
SELECT 'Orphaned investment records:' as status, 
       COUNT(*) as count,
       'Investment records referencing non-existent startups' as description
FROM investment_records ir
LEFT JOIN startups s ON ir.startup_id = s.id
WHERE s.id IS NULL;

-- Check for orphaned startup_shares records
SELECT 'Orphaned startup_shares records:' as status, 
       COUNT(*) as count,
       'Startup_shares referencing non-existent startups' as description
FROM startup_shares ss
LEFT JOIN startups s ON ss.startup_id = s.id
WHERE s.id IS NULL;

-- Show specific orphaned records
SELECT 'Orphaned founder records details:' as status, 
       f.id, f.startup_id, f.user_id, f.shares
FROM founders f
LEFT JOIN startups s ON f.startup_id = s.id
WHERE s.id IS NULL
LIMIT 10;

SELECT 'Orphaned investment records details:' as status, 
       ir.id, ir.startup_id, ir.user_id, ir.amount
FROM investment_records ir
LEFT JOIN startups s ON ir.startup_id = s.id
WHERE s.id IS NULL
LIMIT 10;

-- =====================================================
-- STEP 2: CLEAN UP ORPHANED RECORDS
-- =====================================================

-- Delete orphaned founder records
DELETE FROM founders 
WHERE startup_id NOT IN (SELECT id FROM startups);

-- Delete orphaned investment records
DELETE FROM investment_records 
WHERE startup_id NOT IN (SELECT id FROM startups);

-- Delete orphaned startup_shares records
DELETE FROM startup_shares 
WHERE startup_id NOT IN (SELECT id FROM startups);

-- =====================================================
-- STEP 3: FIX THE TRIGGER FUNCTIONS WITH BETTER ERROR HANDLING
-- =====================================================

CREATE OR REPLACE FUNCTION update_shares_on_founder_change()
RETURNS TRIGGER AS $$
DECLARE
    target_startup_id INTEGER;
    new_total_shares INTEGER;
    new_price_per_share DECIMAL;
    startup_valuation DECIMAL;
    startup_exists BOOLEAN;
BEGIN
    target_startup_id := COALESCE(NEW.startup_id, OLD.startup_id);
    
    -- Check if startup exists
    SELECT EXISTS(SELECT 1 FROM startups WHERE id = target_startup_id) INTO startup_exists;
    
    -- Only proceed if startup exists
    IF startup_exists THEN
        -- Calculate new total shares
        new_total_shares := (
            COALESCE((
                SELECT SUM(shares) 
                FROM founders 
                WHERE startup_id = target_startup_id
            ), 0) +
            COALESCE((
                SELECT SUM(shares) 
                FROM investment_records 
                WHERE startup_id = target_startup_id
            ), 0) +
            COALESCE((
                SELECT esop_reserved_shares 
                FROM startup_shares 
                WHERE startup_id = target_startup_id
            ), 10000) -- Default ESOP if missing
        );
        
        -- Get startup valuation safely
        SELECT COALESCE(current_valuation, 0) INTO startup_valuation
        FROM startups 
        WHERE id = target_startup_id;
        
        -- Calculate new price per share with proper null handling
        new_price_per_share := CASE 
            WHEN new_total_shares > 0 AND startup_valuation > 0 THEN 
                startup_valuation / new_total_shares
            ELSE 0
        END;
        
        -- Update startup_shares if record exists
        UPDATE startup_shares 
        SET 
            total_shares = new_total_shares,
            price_per_share = new_price_per_share,
            updated_at = NOW()
        WHERE startup_id = target_startup_id;
        
        -- If no startup_shares record exists, create one with safe values
        IF NOT FOUND THEN
            INSERT INTO startup_shares (startup_id, total_shares, esop_reserved_shares, price_per_share, updated_at)
            VALUES (target_startup_id, new_total_shares, 10000, new_price_per_share, NOW());
        END IF;
    ELSE
        RAISE NOTICE 'Startup % does not exist, skipping startup_shares update', target_startup_id;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_shares_on_investment_change()
RETURNS TRIGGER AS $$
DECLARE
    target_startup_id INTEGER;
    new_total_shares INTEGER;
    new_price_per_share DECIMAL;
    startup_valuation DECIMAL;
    startup_exists BOOLEAN;
BEGIN
    target_startup_id := COALESCE(NEW.startup_id, OLD.startup_id);
    
    -- Check if startup exists
    SELECT EXISTS(SELECT 1 FROM startups WHERE id = target_startup_id) INTO startup_exists;
    
    -- Only proceed if startup exists
    IF startup_exists THEN
        -- Calculate new total shares
        new_total_shares := (
            COALESCE((
                SELECT SUM(shares) 
                FROM founders 
                WHERE startup_id = target_startup_id
            ), 0) +
            COALESCE((
                SELECT SUM(shares) 
                FROM investment_records 
                WHERE startup_id = target_startup_id
            ), 0) +
            COALESCE((
                SELECT esop_reserved_shares 
                FROM startup_shares 
                WHERE startup_id = target_startup_id
            ), 10000) -- Default ESOP if missing
        );
        
        -- Get startup valuation safely
        SELECT COALESCE(current_valuation, 0) INTO startup_valuation
        FROM startups 
        WHERE id = target_startup_id;
        
        -- Calculate new price per share with proper null handling
        new_price_per_share := CASE 
            WHEN new_total_shares > 0 AND startup_valuation > 0 THEN 
                startup_valuation / new_total_shares
            ELSE 0
        END;
        
        -- Update startup_shares if record exists
        UPDATE startup_shares 
        SET 
            total_shares = new_total_shares,
            price_per_share = new_price_per_share,
            updated_at = NOW()
        WHERE startup_id = target_startup_id;
        
        -- If no startup_shares record exists, create one with safe values
        IF NOT FOUND THEN
            INSERT INTO startup_shares (startup_id, total_shares, esop_reserved_shares, price_per_share, updated_at)
            VALUES (target_startup_id, new_total_shares, 10000, new_price_per_share, NOW());
        END IF;
    ELSE
        RAISE NOTICE 'Startup % does not exist, skipping startup_shares update', target_startup_id;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- STEP 4: NOW TRY DELETING TEST EMAILS
-- =====================================================

-- After cleaning up orphaned records and fixing triggers, try deleting test emails
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
-- STEP 5: VERIFICATION
-- =====================================================

-- Check if deletion was successful
SELECT 'Remaining test emails after deletion:' as status, email, created_at 
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

-- Check for any remaining orphaned records
SELECT 'Remaining orphaned records:' as status, 
       'founders' as table_name,
       COUNT(*) as count
FROM founders f
LEFT JOIN startups s ON f.startup_id = s.id
WHERE s.id IS NULL

UNION ALL

SELECT 'Remaining orphaned records:' as status, 
       'investment_records' as table_name,
       COUNT(*) as count
FROM investment_records ir
LEFT JOIN startups s ON ir.startup_id = s.id
WHERE s.id IS NULL

UNION ALL

SELECT 'Remaining orphaned records:' as status, 
       'startup_shares' as table_name,
       COUNT(*) as count
FROM startup_shares ss
LEFT JOIN startups s ON ss.startup_id = s.id
WHERE s.id IS NULL;

-- Check for any startup_shares records with NULL price_per_share
SELECT 'Startup shares with NULL price_per_share:' as status, 
       startup_id, total_shares, price_per_share
FROM startup_shares 
WHERE price_per_share IS NULL;


