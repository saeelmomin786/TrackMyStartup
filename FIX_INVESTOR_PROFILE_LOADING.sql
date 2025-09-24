-- FIX_INVESTOR_PROFILE_LOADING.sql
-- Fix issues with investor profile loading and fundraising visibility

-- 1. Check the current user profile for the investor
SELECT '=== INVESTOR PROFILE CHECK ===' as info;
SELECT 
    id,
    email,
    name,
    role,
    investor_code,
    created_at
FROM users 
WHERE email = 'olympiad_info1@startupnationindia.com';

-- 2. Check if the user has the correct role
SELECT '=== USER ROLE VERIFICATION ===' as info;
SELECT 
    id,
    email,
    role,
    CASE 
        WHEN role = 'Investor' THEN '✅ Correct role'
        WHEN role IS NULL THEN '❌ Role is NULL'
        ELSE '❌ Wrong role: ' || role
    END as role_status
FROM users 
WHERE email = 'olympiad_info1@startupnationindia.com';

-- 3. Update the user role if it's missing or incorrect
UPDATE users 
SET role = 'Investor'
WHERE email = 'olympiad_info1@startupnationindia.com' 
    AND (role IS NULL OR role != 'Investor');

-- 4. Verify the update
SELECT '=== AFTER ROLE UPDATE ===' as info;
SELECT 
    id,
    email,
    name,
    role,
    investor_code
FROM users 
WHERE email = 'olympiad_info1@startupnationindia.com';

-- 5. Check if the user has an investor code
SELECT '=== INVESTOR CODE CHECK ===' as info;
SELECT 
    id,
    email,
    investor_code,
    CASE 
        WHEN investor_code IS NOT NULL THEN '✅ Has investor code: ' || investor_code
        ELSE '❌ Missing investor code'
    END as investor_code_status
FROM users 
WHERE email = 'olympiad_info1@startupnationindia.com';

-- 6. Generate an investor code if missing
UPDATE users 
SET investor_code = 'INV-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT), 1, 8))
WHERE email = 'olympiad_info1@startupnationindia.com' 
    AND investor_code IS NULL;

-- 7. Final verification
SELECT '=== FINAL INVESTOR PROFILE ===' as info;
SELECT 
    id,
    email,
    name,
    role,
    investor_code,
    created_at
FROM users 
WHERE email = 'olympiad_info1@startupnationindia.com';
