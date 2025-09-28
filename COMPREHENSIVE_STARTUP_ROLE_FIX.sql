-- =====================================================
-- COMPREHENSIVE STARTUP ROLE FIX
-- =====================================================
-- This script fixes all identified startup role issues

-- Step 1: Diagnostic - Check current state
SELECT '=== DIAGNOSTIC: CURRENT STATE ===' as step;

-- Check user roles distribution
SELECT 
    'User Roles Distribution' as info,
    role, 
    COUNT(*) as count 
FROM users 
GROUP BY role 
ORDER BY count DESC;

-- Check startups with user relationships
SELECT 
    'Startups with User Relationships' as info,
    COUNT(*) as total_startups,
    COUNT(user_id) as startups_with_user_id,
    COUNT(*) - COUNT(user_id) as startups_without_user_id
FROM startups;

-- Check investment advisor codes
SELECT 
    'Investment Advisor Codes Status' as info,
    COUNT(*) as total_startups,
    COUNT(investment_advisor_code) as startups_with_codes,
    COUNT(*) - COUNT(investment_advisor_code) as startups_without_codes
FROM startups;

-- Step 2: Fix user_id relationships
SELECT '=== FIXING USER_ID RELATIONSHIPS ===' as step;

-- Add user_id column if missing
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'startups' AND column_name = 'user_id'
    ) THEN
        RAISE NOTICE 'Adding user_id column...';
        ALTER TABLE startups 
        ADD COLUMN user_id UUID REFERENCES users(id) ON DELETE CASCADE;
    ELSE
        RAISE NOTICE 'user_id column already exists';
    END IF;
END $$;

-- Update startups with user relationships based on startup_name
UPDATE startups 
SET user_id = u.id
FROM users u
WHERE u.role = 'Startup' 
  AND u.startup_name = startups.name
  AND startups.user_id IS NULL;

-- Step 3: Fix startup name mismatches
SELECT '=== FIXING STARTUP NAME MISMATCHES ===' as step;

-- Update user startup_name to match startup name
UPDATE users 
SET startup_name = (
    SELECT s.name 
    FROM startups s 
    WHERE s.user_id = users.id 
    LIMIT 1
)
WHERE role = 'Startup' 
AND id IN (
    SELECT s.user_id 
    FROM startups s 
    JOIN users u ON s.user_id = u.id 
    WHERE s.name != u.startup_name
);

-- Step 4: Fix investment advisor codes
SELECT '=== FIXING INVESTMENT ADVISOR CODES ===' as step;

-- Copy codes from users to startups
UPDATE startups 
SET investment_advisor_code = u.investment_advisor_code_entered
FROM users u
WHERE startups.user_id = u.id 
  AND u.role = 'Startup'
  AND u.investment_advisor_code_entered IS NOT NULL
  AND startups.investment_advisor_code IS NULL;

-- Step 5: Create investment advisor relationships
SELECT '=== CREATING INVESTMENT ADVISOR RELATIONSHIPS ===' as step;

-- Create advisor-startup relationships
INSERT INTO investment_advisor_relationships (investment_advisor_id, startup_id, relationship_type)
SELECT 
    advisor.id as investment_advisor_id,
    s.id as startup_id,
    'advisor_startup' as relationship_type
FROM startups s
JOIN users advisor ON advisor.investment_advisor_code = s.investment_advisor_code
WHERE s.investment_advisor_code IS NOT NULL
  AND advisor.role = 'Investment Advisor'
ON CONFLICT (investment_advisor_id, startup_id, relationship_type) DO NOTHING;

-- Create advisor-investor relationships
INSERT INTO investment_advisor_relationships (investment_advisor_id, investor_id, relationship_type)
SELECT 
    advisor.id as investment_advisor_id,
    u.id as investor_id,
    'advisor_investor' as relationship_type
FROM users u
JOIN users advisor ON advisor.investment_advisor_code = u.investment_advisor_code_entered
WHERE u.role = 'Investor'
  AND u.investment_advisor_code_entered IS NOT NULL
  AND advisor.role = 'Investment Advisor'
ON CONFLICT (investment_advisor_id, investor_id, relationship_type) DO NOTHING;

-- Step 6: Verification
SELECT '=== VERIFICATION ===' as step;

-- Check final state
SELECT 
    'Final User-Startup Relationships' as info,
    COUNT(*) as total_startups,
    COUNT(user_id) as startups_with_user_id,
    COUNT(*) - COUNT(user_id) as startups_without_user_id
FROM startups;

-- Check investment advisor codes
SELECT 
    'Final Investment Advisor Codes' as info,
    COUNT(*) as total_startups,
    COUNT(investment_advisor_code) as startups_with_codes,
    COUNT(*) - COUNT(investment_advisor_code) as startups_without_codes
FROM startups;

-- Check relationships
SELECT 
    'Final Relationships' as info,
    COUNT(*) as total_relationships,
    COUNT(CASE WHEN relationship_type = 'advisor_investor' THEN 1 END) as investor_relationships,
    COUNT(CASE WHEN relationship_type = 'advisor_startup' THEN 1 END) as startup_relationships
FROM investment_advisor_relationships;

-- Show sample data
SELECT 
    'Sample Fixed Data' as info,
    s.id as startup_id,
    s.name as startup_name,
    s.user_id,
    u.name as user_name,
    u.startup_name as user_startup_name,
    s.investment_advisor_code,
    CASE 
        WHEN s.name = u.startup_name THEN 'MATCHED'
        ELSE 'MISMATCH'
    END as name_match_status
FROM startups s
LEFT JOIN users u ON s.user_id = u.id
ORDER BY s.created_at DESC
LIMIT 10;

SELECT '=== FIX COMPLETE ===' as step;
