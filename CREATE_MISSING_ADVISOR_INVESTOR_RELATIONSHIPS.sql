-- Create missing advisor-investor relationships in investment_advisor_relationships table
-- This ensures the RLS policy can find the relationships

-- 1. Create relationships for investors in users table
INSERT INTO investment_advisor_relationships (investment_advisor_id, investor_id, relationship_type)
SELECT 
    advisor.id as investment_advisor_id,
    investor.id as investor_id,
    'advisor_investor' as relationship_type
FROM public.users investor
JOIN public.users advisor ON advisor.investment_advisor_code = investor.investment_advisor_code_entered
WHERE investor.role = 'Investor'
  AND investor.investment_advisor_code_entered IS NOT NULL
  AND investor.advisor_accepted = true
  AND advisor.role = 'Investment Advisor'
ON CONFLICT (investment_advisor_id, investor_id, relationship_type) DO NOTHING;

-- 2. Create relationships for investors in user_profiles table
INSERT INTO investment_advisor_relationships (investment_advisor_id, investor_id, relationship_type)
SELECT 
    COALESCE(
        (SELECT id FROM public.users WHERE investment_advisor_code = up.investment_advisor_code_entered AND role = 'Investment Advisor' LIMIT 1),
        (SELECT auth_user_id FROM public.user_profiles WHERE investment_advisor_code = up.investment_advisor_code_entered AND role = 'Investment Advisor' LIMIT 1)
    ) as investment_advisor_id,
    up.auth_user_id as investor_id,
    'advisor_investor' as relationship_type
FROM public.user_profiles up
WHERE up.role = 'Investor'
  AND up.investment_advisor_code_entered IS NOT NULL
  AND up.advisor_accepted = true
  AND EXISTS (
      SELECT 1 FROM public.users 
      WHERE investment_advisor_code = up.investment_advisor_code_entered 
      AND role = 'Investment Advisor'
  )
ON CONFLICT (investment_advisor_id, investor_id, relationship_type) DO NOTHING;

-- 3. Verify relationships were created
SELECT 
    'Created relationships' as info,
    COUNT(*) as total_relationships,
    COUNT(DISTINCT investment_advisor_id) as unique_advisors,
    COUNT(DISTINCT investor_id) as unique_investors
FROM investment_advisor_relationships
WHERE relationship_type = 'advisor_investor';

-- 4. Show sample relationships
SELECT 
    'Sample relationships' as info,
    iar.id,
    iar.investment_advisor_id,
    advisor.name as advisor_name,
    iar.investor_id,
    investor.name as investor_name,
    iar.relationship_type,
    iar.created_at
FROM investment_advisor_relationships iar
LEFT JOIN public.users advisor ON advisor.id = iar.investment_advisor_id
LEFT JOIN public.users investor ON investor.id = iar.investor_id
WHERE iar.relationship_type = 'advisor_investor'
ORDER BY iar.created_at DESC
LIMIT 10;

