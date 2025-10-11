-- =====================================================
-- SUPABASE-SAFE DELETION OF TEST EMAILS
-- =====================================================
-- This script works within Supabase's security model
-- It respects foreign key constraints and system triggers

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
-- STEP 2: SAFE CASCADE DELETION APPROACH
-- =====================================================

-- This approach works by deleting from child tables first,
-- then the parent table, respecting foreign key constraints

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
    user_id_to_delete UUID;
    deleted_count INTEGER := 0;
    error_count INTEGER := 0;
BEGIN
    -- Process each email one by one
    FOR email_to_delete IN SELECT unnest(test_emails) LOOP
        BEGIN
            -- Get the user ID for this email
            SELECT id INTO user_id_to_delete FROM users WHERE email = email_to_delete;
            
            IF user_id_to_delete IS NOT NULL THEN
                RAISE NOTICE 'Processing deletion for: % (ID: %)', email_to_delete, user_id_to_delete;
                
                -- Delete from child tables first (in dependency order)
                -- This respects foreign key constraints
                
                -- 1. Delete from investment advisor tables
                DELETE FROM investment_advisor_recommendations 
                WHERE investment_advisor_id = user_id_to_delete OR investor_id = user_id_to_delete;
                
                DELETE FROM investment_advisor_relationships 
                WHERE investment_advisor_id = user_id_to_delete OR investor_id = user_id_to_delete;
                
                DELETE FROM investment_advisor_commissions 
                WHERE investment_advisor_id = user_id_to_delete OR investor_id = user_id_to_delete;
                
                -- 2. Delete from payment and subscription tables
                DELETE FROM user_subscriptions WHERE user_id = user_id_to_delete;
                DELETE FROM trial_notifications WHERE user_id = user_id_to_delete;
                DELETE FROM trial_audit_log WHERE user_id = user_id_to_delete;
                DELETE FROM payments WHERE user_id = user_id_to_delete;
                
                -- 3. Delete from startup-related tables
                DELETE FROM founders WHERE user_id = user_id_to_delete;
                DELETE FROM investment_records WHERE user_id = user_id_to_delete;
                DELETE FROM equity_holdings WHERE user_id = user_id_to_delete;
                DELETE FROM startup_invitations WHERE facilitator_id = user_id_to_delete;
                
                -- 4. Delete from incubation tables
                DELETE FROM incubation_messages WHERE sender_id = user_id_to_delete OR receiver_id = user_id_to_delete;
                DELETE FROM incubation_contracts WHERE uploaded_by = user_id_to_delete;
                DELETE FROM incubation_opportunities WHERE facilitator_id = user_id_to_delete;
                DELETE FROM incubation_applications WHERE user_id = user_id_to_delete;
                
                -- 5. Delete from profile and audit tables
                DELETE FROM profiles WHERE id = user_id_to_delete;
                DELETE FROM startup_audit_log WHERE user_id = user_id_to_delete;
                DELETE FROM startup_notifications WHERE user_id = user_id_to_delete;
                
                -- 6. Delete from opportunity applications
                DELETE FROM opportunity_applications WHERE user_id = user_id_to_delete;
                
                -- 7. Delete from tax system tables
                DELETE FROM tax_records WHERE created_by = user_id_to_delete;
                
                -- 8. Delete from subsidiary compliance
                DELETE FROM subsidiary_compliance WHERE user_id = user_id_to_delete;
                
                -- 9. Finally, delete from users table (this will cascade to auth.users)
                DELETE FROM users WHERE id = user_id_to_delete;
                
                deleted_count := deleted_count + 1;
                RAISE NOTICE 'Successfully deleted: %', email_to_delete;
                
            ELSE
                RAISE NOTICE 'User not found: %', email_to_delete;
            END IF;
            
        EXCEPTION
            WHEN OTHERS THEN
                error_count := error_count + 1;
                RAISE NOTICE 'Error deleting %: %', email_to_delete, SQLERRM;
        END;
    END LOOP;
    
    RAISE NOTICE 'Deletion completed. Successfully deleted: %, Errors: %', deleted_count, error_count;
END $$;

-- =====================================================
-- STEP 3: ALTERNATIVE - DIRECT AUTH.USERS DELETION
-- =====================================================

-- If the above doesn't work, try deleting directly from auth.users
-- This should cascade to the users table

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
    deleted_count INTEGER;
BEGIN
    -- Delete directly from auth.users (this should cascade)
    DELETE FROM auth.users 
    WHERE email = ANY(test_emails);
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % users from auth.users', deleted_count;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error deleting from auth.users: %', SQLERRM;
END $$;

-- =====================================================
-- STEP 4: MANUAL DELETION BY USER ID
-- =====================================================

-- If the above approaches don't work, you can manually delete by user ID
-- First, get the user IDs:

SELECT 'User IDs for test emails:' as status, id, email 
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

-- Then manually delete each user by their ID (replace 'USER_ID_HERE' with actual IDs):
-- DELETE FROM users WHERE id = 'USER_ID_HERE';
-- DELETE FROM auth.users WHERE id = 'USER_ID_HERE';

-- =====================================================
-- STEP 5: VERIFICATION
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


