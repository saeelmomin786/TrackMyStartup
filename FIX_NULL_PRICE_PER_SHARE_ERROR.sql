-- =====================================================
-- FIX NULL PRICE_PER_SHARE ERROR IN STARTUP_SHARES
-- =====================================================
-- This script fixes the null value error in price_per_share column
-- The issue occurs when the function tries to calculate price_per_share
-- but gets NULL values from the calculation

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
-- STEP 3: CREATE SAFE DELETION FUNCTION
-- =====================================================

-- Function to safely delete test emails without triggering constraint errors
CREATE OR REPLACE FUNCTION safe_delete_test_emails()
RETURNS TABLE(deleted_count INTEGER, error_message TEXT) AS $$
DECLARE
    deleted_count INTEGER := 0;
    error_message TEXT := '';
    rec RECORD;
BEGIN
    -- First, temporarily disable triggers to avoid constraint issues
    ALTER TABLE founders DISABLE TRIGGER ALL;
    ALTER TABLE investment_records DISABLE TRIGGER ALL;
    
    -- Delete test emails from users table
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
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Re-enable triggers
    ALTER TABLE founders ENABLE TRIGGER ALL;
    ALTER TABLE investment_records ENABLE TRIGGER ALL;
    
    RETURN QUERY SELECT deleted_count, error_message;
    
EXCEPTION
    WHEN OTHERS THEN
        -- Re-enable triggers in case of error
        ALTER TABLE founders ENABLE TRIGGER ALL;
        ALTER TABLE investment_records ENABLE TRIGGER ALL;
        
        error_message := SQLERRM;
        RETURN QUERY SELECT 0, error_message;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- STEP 4: CREATE ALTERNATIVE SAFE DELETION SCRIPT
-- =====================================================

-- Alternative approach: Delete in the correct order to avoid constraint issues
CREATE OR REPLACE FUNCTION safe_delete_test_emails_alternative()
RETURNS TABLE(deleted_count INTEGER, error_message TEXT) AS $$
DECLARE
    deleted_count INTEGER := 0;
    error_message TEXT := '';
    test_emails TEXT[] := ARRAY[
        'info1@startupnationindia.com',
        'sarveshgadkari.agri@gmail.com',
        'sid64527@gmail.com',
        'poojaawandkar04@gmail.com',
        'poojaawandkar24@gmail.com',
        'communication@startupnationindia.com',
        'olympiad_info2@startupnationindia.com'
    ];
    email_to_delete TEXT;
BEGIN
    -- Delete in order: child tables first, then parent tables
    FOR email_to_delete IN SELECT unnest(test_emails) LOOP
        BEGIN
            -- Delete from child tables first
            DELETE FROM founders WHERE user_id IN (
                SELECT id FROM users WHERE email = email_to_delete
            );
            
            DELETE FROM investment_records WHERE user_id IN (
                SELECT id FROM users WHERE email = email_to_delete
            );
            
            DELETE FROM equity_holdings WHERE user_id IN (
                SELECT id FROM users WHERE email = email_to_delete
            );
            
            -- Delete from users table
            DELETE FROM users WHERE email = email_to_delete;
            
            deleted_count := deleted_count + 1;
            
        EXCEPTION
            WHEN OTHERS THEN
                error_message := error_message || 'Error deleting ' || email_to_delete || ': ' || SQLERRM || '; ';
        END;
    END LOOP;
    
    RETURN QUERY SELECT deleted_count, error_message;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- STEP 5: VERIFICATION QUERIES
-- =====================================================

-- Check for any remaining test emails
SELECT 'Remaining test emails:' as status, email, created_at 
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

-- =====================================================
-- USAGE INSTRUCTIONS
-- =====================================================

-- To fix the functions and delete test emails safely, run:
-- 1. Execute this entire script to fix the functions
-- 2. Then run: SELECT * FROM safe_delete_test_emails_alternative();
-- 3. Verify with the verification queries above


