-- =====================================================
-- FIX SIDDHI ADVISOR VISIBILITY
-- =====================================================
-- This script specifically fixes the visibility issue for Siddhi (IA-162090)

-- Step 1: Check current state for Siddhi
SELECT '=== CURRENT STATE FOR SIDDHI (IA-162090) ===' as step;

-- Check Siddhi's advisor record
SELECT 
    'Siddhi Advisor Record' as info,
    id,
    name,
    email,
    role,
    investment_advisor_code,
    created_at
FROM users 
WHERE id = '094538f8-c615-4379-a81a-846e891010b9';

-- Check users who entered Siddhi's code
SELECT 
    'Users with Siddhi Code' as info,
    id,
    name,
    email,
    role,
    investment_advisor_code_entered,
    advisor_accepted,
    created_at
FROM users 
WHERE investment_advisor_code_entered = 'IA-162090'
ORDER BY role, created_at;

-- Check startups associated with these users
SELECT 
    'Startups for Siddhi Code Users' as info,
    s.id as startup_id,
    s.name as startup_name,
    s.user_id,
    s.investment_advisor_code,
    u.name as user_name,
    u.email as user_email,
    u.investment_advisor_code_entered,
    u.advisor_accepted
FROM startups s
JOIN users u ON s.user_id = u.id
WHERE u.investment_advisor_code_entered = 'IA-162090'
ORDER BY s.created_at;

-- Step 2: Ensure startups have the correct investment advisor code
SELECT '=== SYNCING STARTUP CODES ===' as step;

-- Update startups with Siddhi's code
UPDATE startups 
SET investment_advisor_code = 'IA-162090'
FROM users u
WHERE startups.user_id = u.id 
  AND u.investment_advisor_code_entered = 'IA-162090'
  AND startups.investment_advisor_code IS NULL;

-- Step 3: Create relationships for Siddhi
SELECT '=== CREATING RELATIONSHIPS FOR SIDDHI ===' as step;

-- Create advisor-startup relationships for Siddhi
INSERT INTO investment_advisor_relationships (investment_advisor_id, startup_id, relationship_type)
SELECT 
    '094538f8-c615-4379-a81a-846e891010b9' as investment_advisor_id,
    s.id as startup_id,
    'advisor_startup' as relationship_type
FROM startups s
WHERE s.investment_advisor_code = 'IA-162090'
ON CONFLICT (investment_advisor_id, startup_id, relationship_type) DO NOTHING;

-- Create advisor-investor relationships for Siddhi (if any investors)
INSERT INTO investment_advisor_relationships (investment_advisor_id, investor_id, relationship_type)
SELECT 
    '094538f8-c615-4379-a81a-846e891010b9' as investment_advisor_id,
    u.id as investor_id,
    'advisor_investor' as relationship_type
FROM users u
WHERE u.role = 'Investor'
  AND u.investment_advisor_code_entered = 'IA-162090'
ON CONFLICT (investment_advisor_id, investor_id, relationship_type) DO NOTHING;

-- Step 4: Verify the fix
SELECT '=== VERIFICATION FOR SIDDHI ===' as step;

-- Check Siddhi's relationships
SELECT 
    'Siddhi Relationships' as info,
    r.id as relationship_id,
    r.relationship_type,
    r.created_at,
    CASE 
        WHEN r.relationship_type = 'advisor_startup' THEN s.name
        WHEN r.relationship_type = 'advisor_investor' THEN u.name
    END as entity_name,
    CASE 
        WHEN r.relationship_type = 'advisor_startup' THEN 'Startup'
        WHEN r.relationship_type = 'advisor_investor' THEN 'Investor'
    END as entity_type
FROM investment_advisor_relationships r
LEFT JOIN startups s ON s.id = r.startup_id
LEFT JOIN users u ON u.id = r.investor_id
WHERE r.investment_advisor_id = '094538f8-c615-4379-a81a-846e891010b9'
ORDER BY r.created_at;

-- Check what should be visible to Siddhi
SELECT 
    'What Siddhi Should See' as info,
    'Startups' as entity_type,
    s.id::text as entity_id,
    s.name as entity_name,
    u.name as user_name,
    u.email as user_email,
    u.advisor_accepted,
    CASE 
        WHEN u.advisor_accepted = true THEN 'ACCEPTED'
        WHEN u.advisor_accepted = false THEN 'PENDING'
        ELSE 'PENDING'
    END as status
FROM startups s
JOIN users u ON s.user_id = u.id
WHERE u.investment_advisor_code_entered = 'IA-162090'
  AND u.role = 'Startup'
UNION ALL
SELECT 
    'What Siddhi Should See' as info,
    'Investors' as entity_type,
    u.id::text as entity_id,
    u.name as entity_name,
    u.name as user_name,
    u.email as user_email,
    u.advisor_accepted,
    CASE 
        WHEN u.advisor_accepted = true THEN 'ACCEPTED'
        WHEN u.advisor_accepted = false THEN 'PENDING'
        ELSE 'PENDING'
    END as status
FROM users u
WHERE u.investment_advisor_code_entered = 'IA-162090'
  AND u.role = 'Investor'
ORDER BY entity_type, entity_name;

-- Step 5: Test the exact query that the frontend should use
SELECT '=== FRONTEND QUERY TEST ===' as step;

-- This is the query the frontend should use to get pending startup requests
SELECT 
    'Pending Startup Requests for Siddhi' as info,
    s.id as startup_id,
    s.name as startup_name,
    s.user_id,
    u.name as user_name,
    u.email as user_email,
    u.investment_advisor_code_entered,
    u.advisor_accepted
FROM startups s
JOIN users u ON s.user_id = u.id
WHERE u.role = 'Startup'
  AND u.investment_advisor_code_entered = 'IA-162090'
  AND (u.advisor_accepted = false OR u.advisor_accepted IS NULL)
ORDER BY s.created_at;

SELECT '=== FIX COMPLETE FOR SIDDHI ===' as step;
