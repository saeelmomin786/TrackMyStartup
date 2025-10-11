-- =====================================================
-- COMPREHENSIVE DELETION OF TEST EMAILS
-- =====================================================
-- This script handles ALL foreign key constraints and safely deletes test emails
-- Run this in your Supabase SQL editor

-- =====================================================
-- STEP 1: CHECK CURRENT TEST EMAILS AND THEIR RELATIONSHIPS
-- =====================================================

-- Check which test emails exist
SELECT 'Current test emails:' as status, email, created_at 
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

-- Check what data is associated with these users
SELECT 'Associated data for test emails:' as status, 
       u.email,
       COUNT(DISTINCT f.id) as founder_records,
       COUNT(DISTINCT ir.id) as investment_records,
       COUNT(DISTINCT eh.id) as equity_holdings,
       COUNT(DISTINCT s.id) as owned_startups
FROM users u
LEFT JOIN founders f ON f.user_id = u.id
LEFT JOIN investment_records ir ON ir.user_id = u.id
LEFT JOIN equity_holdings eh ON eh.user_id = u.id
LEFT JOIN startups s ON s.user_id = u.id
WHERE u.email IN (
    'info1@startupnationindia.com',
    'sarveshgadkari.agri@gmail.com',
    'sid64527@gmail.com',
    'poojaawandkar04@gmail.com',
    'poojaawandkar24@gmail.com',
    'communication@startupnationindia.com',
    'olympiad_info2@startupnationindia.com'
)
GROUP BY u.email, u.id;

-- =====================================================
-- STEP 2: COMPREHENSIVE DELETION WITH ALL CONSTRAINTS
-- =====================================================

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
                
                -- Delete from all tables that reference users.id (in dependency order)
                
                -- 1. Delete from investment advisor tables
                DELETE FROM investment_advisor_recommendations WHERE investment_advisor_id = user_id_to_delete OR investor_id = user_id_to_delete;
                DELETE FROM investment_advisor_relationships WHERE investment_advisor_id = user_id_to_delete OR investor_id = user_id_to_delete;
                DELETE FROM investment_advisor_commissions WHERE investment_advisor_id = user_id_to_delete OR investor_id = user_id_to_delete;
                
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
                
                -- 6. Delete from CS tables (if they exist)
                DELETE FROM cs_assignment_requests WHERE cs_code IN (
                    SELECT cs_code FROM auth.users WHERE id = user_id_to_delete
                );
                DELETE FROM cs_assignments WHERE cs_code IN (
                    SELECT cs_code FROM auth.users WHERE id = user_id_to_delete
                );
                
                -- 7. Delete from opportunity applications
                DELETE FROM opportunity_applications WHERE user_id = user_id_to_delete;
                
                -- 8. Delete from tax system tables
                DELETE FROM tax_records WHERE created_by = user_id_to_delete;
                
                -- 9. Delete from subsidiary compliance
                DELETE FROM subsidiary_compliance WHERE user_id = user_id_to_delete;
                
                -- 10. Finally, delete from users table
                DELETE FROM users WHERE id = user_id_to_delete;
                
                -- 11. Delete from auth.users (this will cascade to users table)
                DELETE FROM auth.users WHERE id = user_id_to_delete;
                
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
-- STEP 3: ALTERNATIVE APPROACH - DISABLE TRIGGERS
-- =====================================================

-- If the above doesn't work, try this approach:
-- This temporarily disables all triggers and constraints

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
BEGIN
    -- Disable all triggers temporarily
    ALTER TABLE founders DISABLE TRIGGER ALL;
    ALTER TABLE investment_records DISABLE TRIGGER ALL;
    ALTER TABLE equity_holdings DISABLE TRIGGER ALL;
    ALTER TABLE startups DISABLE TRIGGER ALL;
    ALTER TABLE startup_shares DISABLE TRIGGER ALL;
    
    -- Delete test emails
    DELETE FROM users WHERE email = ANY(test_emails);
    
    -- Re-enable triggers
    ALTER TABLE founders ENABLE TRIGGER ALL;
    ALTER TABLE investment_records ENABLE TRIGGER ALL;
    ALTER TABLE equity_holdings ENABLE TRIGGER ALL;
    ALTER TABLE startups ENABLE TRIGGER ALL;
    ALTER TABLE startup_shares ENABLE TRIGGER ALL;
    
    RAISE NOTICE 'Deletion completed with triggers disabled';
END $$;

-- =====================================================
-- STEP 4: VERIFICATION
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

-- Check for any orphaned records
SELECT 'Orphaned records check:' as status,
       'founders' as table_name,
       COUNT(*) as orphaned_count
FROM founders f
LEFT JOIN users u ON f.user_id = u.id
WHERE u.id IS NULL

UNION ALL

SELECT 'Orphaned records check:' as status,
       'investment_records' as table_name,
       COUNT(*) as orphaned_count
FROM investment_records ir
LEFT JOIN users u ON ir.user_id = u.id
WHERE u.id IS NULL;

-- =====================================================
-- STEP 5: MANUAL DELETION (If all else fails)
-- =====================================================

-- If the automated deletion still doesn't work, you can manually delete by:
-- 1. First, identify the specific user IDs:
-- SELECT id, email FROM users WHERE email IN ('test@email.com');

-- 2. Then delete from each table manually:
-- DELETE FROM founders WHERE user_id = 'specific-uuid-here';
-- DELETE FROM investment_records WHERE user_id = 'specific-uuid-here';
-- DELETE FROM equity_holdings WHERE user_id = 'specific-uuid-here';
-- DELETE FROM users WHERE id = 'specific-uuid-here';
-- DELETE FROM auth.users WHERE id = 'specific-uuid-here';


