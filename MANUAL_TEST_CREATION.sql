-- MANUAL TEST CREATION
-- This script will manually create relationships and offers to test the system

-- =====================================================
-- 1. CREATE RELATIONSHIPS MANUALLY
-- =====================================================

-- First, let's see what startups have advisor codes
SELECT 'Startups with Advisor Codes' as info;
SELECT s.id, s.name, s.investment_advisor_code, u.name as advisor_name
FROM startups s
LEFT JOIN users u ON u.investment_advisor_code = s.investment_advisor_code
WHERE s.investment_advisor_code IS NOT NULL
ORDER BY s.id;

-- Create relationships manually
INSERT INTO investment_advisor_relationships (investment_advisor_id, startup_id, relationship_type)
SELECT 
    advisor.id as investment_advisor_id,
    s.id as startup_id,
    'advisor_startup' as relationship_type
FROM startups s
JOIN users advisor ON advisor.investment_advisor_code = s.investment_advisor_code
WHERE s.investment_advisor_code IS NOT NULL
    AND advisor.role IN ('Investment Advisor', 'Admin')
ON CONFLICT (investment_advisor_id, startup_id, relationship_type) DO NOTHING;

-- Check how many relationships were created
SELECT 'Relationships Created' as info, COUNT(*) as count FROM investment_advisor_relationships;

-- =====================================================
-- 2. CREATE OFFERS MANUALLY
-- =====================================================

-- Create offers for existing relationships
INSERT INTO investment_offers (
    startup_id,
    startup_name,
    investor_email,
    investor_name,
    offer_amount,
    equity_percentage,
    status,
    created_at
)
SELECT 
    r.startup_id,
    s.name as startup_name,
    advisor.email as investor_email,
    advisor.name as investor_name,
    0 as offer_amount,
    0 as equity_percentage,
    'pending' as status,
    NOW() as created_at
FROM investment_advisor_relationships r
JOIN users advisor ON advisor.id = r.investment_advisor_id
JOIN startups s ON s.id = r.startup_id
WHERE r.relationship_type = 'advisor_startup'
    AND NOT EXISTS (
        SELECT 1 FROM investment_offers o 
        WHERE o.startup_id = r.startup_id 
          AND o.investor_email = advisor.email
    )
ON CONFLICT (startup_id, investor_email) DO NOTHING;

-- Check how many offers were created
SELECT 'Offers Created' as info, COUNT(*) as count FROM investment_offers;

-- =====================================================
-- 3. FINAL RESULTS
-- =====================================================

SELECT 'Final Results' as section;
SELECT 
  'Relationships' as type,
  COUNT(*) as count
FROM investment_advisor_relationships

UNION ALL

SELECT 
  'Offers' as type,
  COUNT(*) as count
FROM investment_offers;
