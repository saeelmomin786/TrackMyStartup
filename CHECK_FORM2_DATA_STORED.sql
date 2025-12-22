-- =====================================================
-- CHECK IF FORM 2 DATA IS STORED IN USER_PROFILES
-- =====================================================
-- This script checks if Form 2 data (country, company_type, etc.)
-- is being stored in the user_profiles table
-- =====================================================

-- Replace '7makodas@gmail.com' with your email
-- Replace 'NEW TESTING' with your startup name if different

-- =====================================================
-- STEP 1: CHECK PROFILE DATA IN USER_PROFILES
-- =====================================================

SELECT '=== PROFILE DATA IN USER_PROFILES ===' as info;

SELECT 
    up.id as profile_id,
    up.email,
    up.name,
    up.role,
    up.startup_name,
    up.is_profile_complete,
    -- Form 2 fields that should be saved
    up.country,
    up.company_type,
    up.registration_date,
    up.currency,
    up.ca_service_code,
    up.cs_service_code,
    up.investment_advisor_code_entered,
    -- Document fields
    up.government_id,
    up.ca_license,
    up.verification_documents,
    up.logo_url,
    up.financial_advisor_license_url,
    -- Timestamps
    up.created_at,
    up.updated_at
FROM user_profiles up
WHERE up.email = '7makodas@gmail.com'  -- Replace with your email
    AND up.role = 'Startup'
ORDER BY up.created_at DESC
LIMIT 5;

-- =====================================================
-- STEP 2: CHECK STARTUP DATA
-- =====================================================

SELECT '=== STARTUP DATA ===' as info;

SELECT 
    s.id as startup_id,
    s.name as startup_name,
    s.user_id as auth_user_id,
    s.country,
    s.company_type,
    s.registration_date,
    s.currency,
    s.ca_service_code,
    s.cs_service_code,
    s.compliance_status,
    s.created_at,
    s.updated_at
FROM startups s
INNER JOIN auth.users au ON s.user_id = au.id
WHERE au.email = '7makodas@gmail.com'  -- Replace with your email
ORDER BY s.created_at DESC
LIMIT 5;

-- =====================================================
-- STEP 3: COMPARE PROFILE VS STARTUP DATA
-- =====================================================

SELECT '=== COMPARISON: PROFILE VS STARTUP DATA ===' as info;

SELECT 
    up.id as profile_id,
    up.startup_name as profile_startup_name,
    up.country as profile_country,
    up.company_type as profile_company_type,
    up.registration_date as profile_registration_date,
    up.currency as profile_currency,
    s.id as startup_id,
    s.name as startup_name,
    s.country as startup_country,
    s.company_type as startup_company_type,
    s.registration_date as startup_registration_date,
    s.currency as startup_currency,
    CASE 
        WHEN up.country IS NULL AND s.country IS NOT NULL THEN '⚠️ Country missing in profile, exists in startup'
        WHEN up.company_type IS NULL AND s.company_type IS NOT NULL THEN '⚠️ Company type missing in profile, exists in startup'
        WHEN up.registration_date IS NULL AND s.registration_date IS NOT NULL THEN '⚠️ Registration date missing in profile, exists in startup'
        WHEN up.country IS NOT NULL AND s.country IS NOT NULL THEN '✅ Data exists in both'
        ELSE '❌ Data missing in both'
    END as status
FROM user_profiles up
INNER JOIN auth.users au ON up.auth_user_id = au.id
LEFT JOIN startups s ON s.user_id = au.id AND s.name = up.startup_name
WHERE up.email = '7makodas@gmail.com'  -- Replace with your email
    AND up.role = 'Startup'
ORDER BY up.created_at DESC;

-- =====================================================
-- STEP 4: SUMMARY
-- =====================================================

SELECT '=== SUMMARY ===' as info;

SELECT 
    (SELECT COUNT(*) FROM user_profiles 
     WHERE email = '7makodas@gmail.com' 
     AND role = 'Startup' 
     AND country IS NOT NULL) as profiles_with_country,
    (SELECT COUNT(*) FROM user_profiles 
     WHERE email = '7makodas@gmail.com' 
     AND role = 'Startup' 
     AND company_type IS NOT NULL) as profiles_with_company_type,
    (SELECT COUNT(*) FROM user_profiles 
     WHERE email = '7makodas@gmail.com' 
     AND role = 'Startup' 
     AND registration_date IS NOT NULL) as profiles_with_registration_date,
    (SELECT COUNT(*) FROM user_profiles 
     WHERE email = '7makodas@gmail.com' 
     AND role = 'Startup' 
     AND currency IS NOT NULL) as profiles_with_currency,
    (SELECT COUNT(*) FROM user_profiles 
     WHERE email = '7makodas@gmail.com' 
     AND role = 'Startup' 
     AND is_profile_complete = true) as completed_profiles;































