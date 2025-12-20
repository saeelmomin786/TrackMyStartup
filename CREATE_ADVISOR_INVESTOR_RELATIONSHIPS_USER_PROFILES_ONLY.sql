-- Create missing advisor-investor relationships
-- UPDATED: Only uses user_profiles table (new system)

-- 1. Create relationships for investors in user_profiles table
INSERT INTO investment_advisor_relationships (investment_advisor_id, investor_id, relationship_type)
SELECT 
    advisor.auth_user_id as investment_advisor_id,
    investor.auth_user_id as investor_id,
    'advisor_investor' as relationship_type
FROM public.user_profiles investor
JOIN public.user_profiles advisor ON advisor.investment_advisor_code = investor.investment_advisor_code_entered
WHERE investor.role = 'Investor'
  AND investor.investment_advisor_code_entered IS NOT NULL
  AND investor.advisor_accepted = true
  AND advisor.role = 'Investment Advisor'
  AND advisor.auth_user_id IS NOT NULL
  AND investor.auth_user_id IS NOT NULL
ON CONFLICT (investment_advisor_id, investor_id, relationship_type) DO NOTHING;

-- 2. Verify relationships were created
SELECT 
    'Created relationships' as info,
    COUNT(*) as total_relationships,
    COUNT(DISTINCT investment_advisor_id) as unique_advisors,
    COUNT(DISTINCT investor_id) as unique_investors
FROM investment_advisor_relationships
WHERE relationship_type = 'advisor_investor';

-- 3. Show sample relationships
SELECT 
    'Sample relationships' as info,
    iar.id,
    iar.investment_advisor_id,
    advisor.name as advisor_name,
    advisor.email as advisor_email,
    iar.investor_id,
    investor.name as investor_name,
    investor.email as investor_email,
    iar.relationship_type,
    iar.created_at
FROM investment_advisor_relationships iar
LEFT JOIN public.user_profiles advisor ON advisor.auth_user_id = iar.investment_advisor_id
LEFT JOIN public.user_profiles investor ON investor.auth_user_id = iar.investor_id
WHERE iar.relationship_type = 'advisor_investor'
ORDER BY iar.created_at DESC
LIMIT 10;

