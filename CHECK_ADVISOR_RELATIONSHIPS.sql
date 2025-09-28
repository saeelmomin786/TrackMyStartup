-- Check the current state of advisor relationships and offers

-- 1. Check all investment advisor relationships
SELECT 
    'Investment Advisor Relationships' as info,
    id,
    investment_advisor_id,
    startup_id,
    investor_id,
    relationship_type,
    created_at
FROM investment_advisor_relationships
ORDER BY created_at DESC;

-- 2. Check all investment offers
SELECT 
    'Investment Offers' as info,
    id,
    startup_id,
    startup_name,
    investor_email,
    investor_name,
    offer_amount,
    equity_percentage,
    status,
    created_at
FROM investment_offers
ORDER BY created_at DESC;

-- 3. Check users with investment advisor codes
SELECT 
    'Users with Advisor Codes' as info,
    id,
    name,
    email,
    role,
    investment_advisor_code,
    investment_advisor_code_entered,
    advisor_accepted
FROM users 
WHERE investment_advisor_code IS NOT NULL 
   OR investment_advisor_code_entered IS NOT NULL
ORDER BY created_at DESC;

-- 4. Check startups with advisor codes
SELECT 
    'Startups with Advisor Codes' as info,
    s.id,
    s.name,
    s.investment_advisor_code,
    u.name as user_name,
    u.email as user_email
FROM startups s
LEFT JOIN users u ON u.id = s.user_id
WHERE s.investment_advisor_code IS NOT NULL
ORDER BY s.created_at DESC;
