-- Manual Update Startup Investment Advisor Code
-- This script manually adds the investment advisor code to your startup

-- 1. First, let's see what startups exist
SELECT 
    'Available Startups' as info,
    id,
    name,
    investment_advisor_code,
    user_id
FROM startups 
ORDER BY created_at DESC;

-- 2. Update your startup with the investment advisor code
-- Replace 'YOUR_STARTUP_ID' with your actual startup ID
-- Replace 'IA-XXXXXX' with the actual investment advisor code you want to use

-- Example: If your startup ID is 1 and the advisor code is IA-123456
UPDATE startups 
SET investment_advisor_code = 'IA-123456'  -- Replace with actual advisor code
WHERE id = 1;  -- Replace with your actual startup ID

-- 3. Verify the update
SELECT 
    'Updated Startup' as info,
    id,
    name,
    investment_advisor_code,
    user_id
FROM startups 
WHERE id = 1;  -- Replace with your actual startup ID

-- 4. Now create the relationship
INSERT INTO investment_advisor_relationships (investment_advisor_id, startup_id, relationship_type)
SELECT 
    advisor.id,
    1,  -- Replace with your actual startup ID
    'advisor_startup'
FROM users advisor
WHERE advisor.role = 'Investment Advisor'
  AND advisor.investment_advisor_code = 'IA-123456'  -- Replace with actual advisor code
ON CONFLICT (investment_advisor_id, startup_id, relationship_type) DO NOTHING;

-- 5. Verify the relationship was created
SELECT 
    'Created Relationship' as info,
    r.id,
    r.relationship_type,
    r.created_at,
    s.name as startup_name,
    u.name as advisor_name
FROM investment_advisor_relationships r
JOIN startups s ON s.id = r.startup_id
JOIN users u ON u.id = r.investment_advisor_id
WHERE r.startup_id = 1;  -- Replace with your actual startup ID
