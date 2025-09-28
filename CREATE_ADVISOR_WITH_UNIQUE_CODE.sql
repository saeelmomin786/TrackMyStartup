-- Create Advisor with Unique Code
-- This script creates a new Investment Advisor with a unique code and updates the startup

-- 1. First, let's see what codes already exist
SELECT 
    'Existing Advisor Codes' as info,
    id,
    name,
    email,
    role,
    investment_advisor_code
FROM users 
WHERE investment_advisor_code IS NOT NULL
ORDER BY investment_advisor_code;

-- 2. Generate a new unique code
-- We'll use a pattern like IA-XXXXXX where XXXXXX is a random 6-digit number
DO $$
DECLARE
    new_code TEXT;
    code_exists BOOLEAN;
BEGIN
    LOOP
        -- Generate a code like IA-XXXXXX
        new_code := 'IA-' || LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');
        
        -- Check if code already exists
        SELECT EXISTS(SELECT 1 FROM users WHERE investment_advisor_code = new_code) INTO code_exists;
        
        -- If code doesn't exist, break the loop
        IF NOT code_exists THEN
            EXIT;
        END IF;
    END LOOP;
    
    -- Create the new Investment Advisor user
    INSERT INTO users (
        id,
        name,
        email,
        role,
        investment_advisor_code,
        created_at,
        updated_at
    ) VALUES (
        '00000000-0000-0000-0000-000000000001',  -- Fixed UUID
        'Investment Advisor (IA-629552)',  -- Name for the advisor
        'advisor-ia629552@trackmystartup.com',  -- Email for the advisor
        'Investment Advisor',  -- Role
        new_code,  -- The new unique code
        NOW(),  -- Created at
        NOW()   -- Updated at
    );
    
    -- Update the startup that was using IA-629552 to use the new code
    UPDATE startups 
    SET investment_advisor_code = new_code
    WHERE investment_advisor_code = 'IA-629552';
    
    -- Also update the user who entered IA-629552
    UPDATE users 
    SET investment_advisor_code_entered = new_code
    WHERE investment_advisor_code_entered = 'IA-629552';
    
    RAISE NOTICE 'Created new Investment Advisor with code: %', new_code;
END $$;

-- 3. Verify the new user was created
SELECT 
    'New Investment Advisor Created' as info,
    id,
    name,
    email,
    role,
    investment_advisor_code,
    created_at
FROM users 
WHERE id = '00000000-0000-0000-0000-000000000001';

-- 4. Check updated startups
SELECT 
    'Updated Startups' as info,
    s.id as startup_id,
    s.name as startup_name,
    s.investment_advisor_code,
    u.name as user_name
FROM startups s
JOIN users u ON u.id = s.user_id
WHERE s.investment_advisor_code IS NOT NULL;

-- 5. Create the relationships
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

-- 6. Also create relationships for investors
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

-- 7. Final verification
SELECT 
    'Final Relationships' as info,
    COUNT(*) as total_relationships,
    COUNT(CASE WHEN relationship_type = 'advisor_investor' THEN 1 END) as investor_relationships,
    COUNT(CASE WHEN relationship_type = 'advisor_startup' THEN 1 END) as startup_relationships
FROM investment_advisor_relationships;

-- 8. Show the actual relationships
SELECT 
    'Created Relationships' as info,
    r.id,
    r.relationship_type,
    r.created_at,
    CASE 
        WHEN r.relationship_type = 'advisor_investor' THEN u.name
        WHEN r.relationship_type = 'advisor_startup' THEN s.name
    END as entity_name,
    CASE 
        WHEN r.relationship_type = 'advisor_investor' THEN u.email
        WHEN r.relationship_type = 'advisor_startup' THEN 'N/A'
    END as entity_email,
    advisor.name as advisor_name,
    advisor.email as advisor_email
FROM investment_advisor_relationships r
LEFT JOIN users u ON u.id = r.investor_id
LEFT JOIN startups s ON s.id = r.startup_id
LEFT JOIN users advisor ON advisor.id = r.investment_advisor_id
ORDER BY r.created_at DESC;
