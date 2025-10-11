-- =====================================================
-- SIMPLE SUPABASE DELETION (NO TRIGGER DISABLE)
-- =====================================================
-- This approach works within Supabase's security model
-- No trigger disabling required

-- =====================================================
-- STEP 1: GET USER IDs FIRST
-- =====================================================

-- Check which test emails exist and get their IDs
SELECT 'Test emails to delete:' as status, id, email, created_at 
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
-- STEP 2: DELETE FROM AUTH.USERS (CASCADE APPROACH)
-- =====================================================

-- Try deleting directly from auth.users first
-- This should cascade to the users table due to the foreign key relationship
DELETE FROM auth.users 
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
-- STEP 3: ALTERNATIVE - DELETE FROM USERS TABLE
-- =====================================================

-- If the above doesn't work, try deleting from users table
-- This should also cascade to auth.users
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
-- STEP 4: MANUAL DELETION BY ID (If needed)
-- =====================================================

-- If the above doesn't work, you'll need to delete by specific user IDs
-- First, get the IDs:
-- SELECT id, email FROM users WHERE email IN ('test@email.com');

-- Then delete each one manually:
-- DELETE FROM users WHERE id = 'specific-uuid-here';
-- DELETE FROM auth.users WHERE id = 'specific-uuid-here';

-- =====================================================
-- STEP 5: VERIFICATION
-- =====================================================

-- Check if deletion was successful
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


