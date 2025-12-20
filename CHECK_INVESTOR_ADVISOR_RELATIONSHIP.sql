-- Check if the investor-advisor relationship exists in investment_advisor_relationships table
-- This is what the RLS policy is checking

-- 1. Check if investment_advisor_relationships table exists
SELECT 
    'Table exists check' as test,
    EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'investment_advisor_relationships'
    ) as table_exists;

-- 2. Check structure of investment_advisor_relationships table
SELECT 
    'Table structure' as test,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'investment_advisor_relationships'
ORDER BY ordinal_position;

-- 3. Check relationships for the advisor (replace with actual advisor ID)
-- Advisor ID: 7322be22-6fbe-41ed-942b-b80c8721cd77
SELECT 
    'Relationships for advisor' as test,
    iar.*
FROM investment_advisor_relationships iar
WHERE iar.investment_advisor_id = '7322be22-6fbe-41ed-942b-b80c8721cd77';

-- 4. Check if relationship exists for the investor
-- Investor ID: 31f063f4-256a-490a-bb47-338482e3c441
SELECT 
    'Relationship for investor' as test,
    iar.*
FROM investment_advisor_relationships iar
WHERE iar.investment_advisor_id = '7322be22-6fbe-41ed-942b-b80c8721cd77'
AND iar.investor_id = '31f063f4-256a-490a-bb47-338482e3c441';

-- 5. Check all relationships (sample)
SELECT 
    'Sample relationships' as test,
    iar.*
FROM investment_advisor_relationships iar
LIMIT 10;

-- 6. Check if investor has favorites
SELECT 
    'Investor favorites count' as test,
    COUNT(*) as favorite_count
FROM investor_favorites
WHERE investor_id = '31f063f4-256a-490a-bb47-338482e3c441';

-- 7. Check what relationship_types exist
SELECT 
    'Relationship types' as test,
    relationship_type,
    COUNT(*) as count
FROM investment_advisor_relationships
GROUP BY relationship_type;

