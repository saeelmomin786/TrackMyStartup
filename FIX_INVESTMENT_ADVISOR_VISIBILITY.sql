-- =====================================================
-- FIX INVESTMENT ADVISOR VISIBILITY
-- =====================================================
-- This script fixes the issue where investment advisors can't see startups in their dashboard

-- Step 1: Add missing advisor_accepted column if it doesn't exist
SELECT '=== ADDING MISSING COLUMNS ===' as step;

-- Add advisor_accepted column
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS advisor_accepted BOOLEAN DEFAULT FALSE;

-- Add advisor_accepted_date column
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS advisor_accepted_date TIMESTAMP WITH TIME ZONE;

-- Add financial matrix columns
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS minimum_investment DECIMAL(15,2),
ADD COLUMN IF NOT EXISTS maximum_investment DECIMAL(15,2),
ADD COLUMN IF NOT EXISTS investment_stage TEXT,
ADD COLUMN IF NOT EXISTS success_fee DECIMAL(15,2),
ADD COLUMN IF NOT EXISTS success_fee_type TEXT DEFAULT 'percentage',
ADD COLUMN IF NOT EXISTS scouting_fee DECIMAL(15,2);

-- Step 2: Ensure all startups have proper investment advisor codes
SELECT '=== SYNCING INVESTMENT ADVISOR CODES ===' as step;

-- Copy codes from users to startups table
UPDATE startups 
SET investment_advisor_code = u.investment_advisor_code_entered
FROM users u
WHERE startups.user_id = u.id 
  AND u.role = 'Startup'
  AND u.investment_advisor_code_entered IS NOT NULL
  AND startups.investment_advisor_code IS NULL;

-- Step 3: Create investment advisor relationships
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

-- Step 4: Verify the fix
SELECT '=== VERIFICATION ===' as step;

-- Check investment advisors and their associated startups
SELECT 
    'Advisor-Startup Relationships' as info,
    advisor.id as advisor_id,
    advisor.name as advisor_name,
    advisor.investment_advisor_code,
    COUNT(r.id) as total_relationships,
    COUNT(CASE WHEN r.relationship_type = 'advisor_startup' THEN 1 END) as startup_relationships,
    COUNT(CASE WHEN r.relationship_type = 'advisor_investor' THEN 1 END) as investor_relationships
FROM users advisor
LEFT JOIN investment_advisor_relationships r ON advisor.id = r.investment_advisor_id
WHERE advisor.role = 'Investment Advisor'
GROUP BY advisor.id, advisor.name, advisor.investment_advisor_code
ORDER BY advisor.created_at;

-- Check what startups should be visible to each advisor
SELECT 
    'Startups Visible to Advisors' as info,
    advisor.name as advisor_name,
    advisor.investment_advisor_code,
    s.name as startup_name,
    u.name as startup_user_name,
    u.investment_advisor_code_entered,
    u.advisor_accepted,
    CASE 
        WHEN u.advisor_accepted = true THEN 'ACCEPTED'
        WHEN u.advisor_accepted = false THEN 'PENDING'
        ELSE 'PENDING'
    END as status
FROM users advisor
JOIN startups s ON s.investment_advisor_code = advisor.investment_advisor_code
JOIN users u ON s.user_id = u.id
WHERE advisor.role = 'Investment Advisor'
ORDER BY advisor.name, s.name;

-- Check what investors should be visible to each advisor
SELECT 
    'Investors Visible to Advisors' as info,
    advisor.name as advisor_name,
    advisor.investment_advisor_code,
    u.name as investor_name,
    u.email as investor_email,
    u.investment_advisor_code_entered,
    u.advisor_accepted,
    CASE 
        WHEN u.advisor_accepted = true THEN 'ACCEPTED'
        WHEN u.advisor_accepted = false THEN 'PENDING'
        ELSE 'PENDING'
    END as status
FROM users advisor
JOIN users u ON u.investment_advisor_code_entered = advisor.investment_advisor_code
WHERE advisor.role = 'Investment Advisor'
  AND u.role = 'Investor'
ORDER BY advisor.name, u.name;

-- Step 5: Show the complete picture
SELECT '=== COMPLETE VISIBILITY CHECK ===' as step;
SELECT 
    'Summary' as info,
    COUNT(DISTINCT advisor.id) as total_advisors,
    COUNT(DISTINCT s.id) as total_startups_with_codes,
    COUNT(DISTINCT u.id) as total_investors_with_codes,
    COUNT(DISTINCT r.id) as total_relationships
FROM users advisor
LEFT JOIN startups s ON s.investment_advisor_code = advisor.investment_advisor_code
LEFT JOIN users u ON u.investment_advisor_code_entered = advisor.investment_advisor_code
LEFT JOIN investment_advisor_relationships r ON r.investment_advisor_id = advisor.id
WHERE advisor.role = 'Investment Advisor';

SELECT '=== FIX COMPLETE ===' as step;
