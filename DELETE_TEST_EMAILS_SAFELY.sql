-- =====================================================
-- SAFE DELETION OF TEST EMAILS
-- =====================================================
-- This script safely deletes test emails without triggering constraint errors
-- Run this in your Supabase SQL editor

-- =====================================================
-- STEP 1: CHECK CURRENT TEST EMAILS
-- =====================================================

SELECT 'Current test emails in database:' as status, email, created_at 
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

-- =====================================================
-- STEP 2: SAFE DELETION (Run this section)
-- =====================================================

-- Delete test emails safely by handling foreign key constraints
DO $$
DECLARE
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
    deleted_count INTEGER := 0;
BEGIN
    -- Delete each email one by one to handle constraints properly
    FOR email_to_delete IN SELECT unnest(test_emails) LOOP
        BEGIN
            -- Delete from child tables first (in order of dependency)
            DELETE FROM founders WHERE user_id IN (
                SELECT id FROM users WHERE email = email_to_delete
            );
            
            DELETE FROM investment_records WHERE user_id IN (
                SELECT id FROM users WHERE email = email_to_delete
            );
            
            DELETE FROM equity_holdings WHERE user_id IN (
                SELECT id FROM users WHERE email = email_to_delete
            );
            
            DELETE FROM startup_profiles WHERE startup_id IN (
                SELECT id FROM startups WHERE founder_id IN (
                    SELECT id FROM users WHERE email = email_to_delete
                )
            );
            
            -- Delete from users table
            DELETE FROM users WHERE email = email_to_delete;
            
            deleted_count := deleted_count + 1;
            RAISE NOTICE 'Successfully deleted: %', email_to_delete;
            
        EXCEPTION
            WHEN OTHERS THEN
                RAISE NOTICE 'Error deleting %: %', email_to_delete, SQLERRM;
        END;
    END LOOP;
    
    RAISE NOTICE 'Total emails deleted: %', deleted_count;
END $$;

-- =====================================================
-- STEP 3: VERIFICATION
-- =====================================================

-- Check if any test emails remain
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

-- Check for any startup_shares records with NULL price_per_share
SELECT 'Startup shares with NULL price_per_share:' as status, startup_id, total_shares, price_per_share
FROM startup_shares 
WHERE price_per_share IS NULL;

-- =====================================================
-- ALTERNATIVE: IF THE ABOVE DOESN'T WORK
-- =====================================================

-- If you still get constraint errors, try this approach:
-- 1. First, temporarily disable triggers:
-- ALTER TABLE founders DISABLE TRIGGER ALL;
-- ALTER TABLE investment_records DISABLE TRIGGER ALL;

-- 2. Then run the deletion:
-- DELETE FROM users WHERE email IN (
--     'info1@startupnationindia.com',
--     'sarveshgadkari.agri@gmail.com',
--     'sid64527@gmail.com',
--     'poojaawandkar04@gmail.com',
--     'poojaawandkar24@gmail.com',
--     'communication@startupnationindia.com',
--     'olympiad_info2@startupnationindia.com'
-- );

-- 3. Re-enable triggers:
-- ALTER TABLE founders ENABLE TRIGGER ALL;
-- ALTER TABLE investment_records ENABLE TRIGGER ALL;


