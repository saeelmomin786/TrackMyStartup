-- =====================================================
-- FIX THE TRIGGER FUNCTION FIRST
-- =====================================================
-- This fixes the root cause of the NULL price_per_share error
-- Run this BEFORE trying to delete the test emails

-- =====================================================
-- STEP 1: FIX THE UPDATE_SHARES_ON_FOUNDER_CHANGE FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION update_shares_on_founder_change()
RETURNS TRIGGER AS $$
DECLARE
    target_startup_id INTEGER;
    new_total_shares INTEGER;
    new_price_per_share DECIMAL;
    startup_valuation DECIMAL;
BEGIN
    target_startup_id := COALESCE(NEW.startup_id, OLD.startup_id);
    
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
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- STEP 2: FIX THE UPDATE_SHARES_ON_INVESTMENT_CHANGE FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION update_shares_on_investment_change()
RETURNS TRIGGER AS $$
DECLARE
    target_startup_id INTEGER;
    new_total_shares INTEGER;
    new_price_per_share DECIMAL;
    startup_valuation DECIMAL;
BEGIN
    target_startup_id := COALESCE(NEW.startup_id, OLD.startup_id);
    
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
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- STEP 3: VERIFY THE FIX
-- =====================================================

-- Check if there are any startup_shares records with NULL price_per_share
SELECT 'Startup shares with NULL price_per_share (should be 0):' as status, 
       startup_id, total_shares, price_per_share
FROM startup_shares 
WHERE price_per_share IS NULL;

-- =====================================================
-- STEP 4: NOW TRY DELETING TEST EMAILS
-- =====================================================

-- After fixing the functions, try deleting test emails
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

-- Check for any remaining NULL price_per_share values
SELECT 'Startup shares with NULL price_per_share after fix:' as status, 
       startup_id, total_shares, price_per_share
FROM startup_shares 
WHERE price_per_share IS NULL;


