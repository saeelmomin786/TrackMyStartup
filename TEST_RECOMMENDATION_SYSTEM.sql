-- Test the recommendation system
-- This script helps verify that the recommendation system is working

-- 1. Check if the table exists and has data
SELECT 
    'Table exists' as status,
    COUNT(*) as total_recommendations
FROM investment_advisor_recommendations;

-- 2. Check if the function exists and works
-- (Replace 'your-investor-id-here' with an actual investor ID from your users table)
-- SELECT * FROM get_investor_recommendations('your-investor-id-here');

-- 3. Check table structure
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'investment_advisor_recommendations'
ORDER BY ordinal_position;

-- 4. Check if RLS is enabled
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename = 'investment_advisor_recommendations';

-- 5. Check policies
SELECT 
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE tablename = 'investment_advisor_recommendations';
