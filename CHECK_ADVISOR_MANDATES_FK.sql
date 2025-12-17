-- =====================================================
-- CHECK advisor_mandates FOREIGN KEY RELATIONSHIP
-- =====================================================
-- This script specifically checks what advisor_mandates.advisor_id references
-- =====================================================

-- 1. Check advisor_mandates table structure
SELECT 
    'advisor_mandates columns' as category,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'advisor_mandates'
ORDER BY ordinal_position;

-- 2. Check FK constraint for advisor_id
SELECT 
    'advisor_mandates FK constraint' as category,
    tc.constraint_name,
    kcu.column_name as fk_column,
    ccu.table_schema as referenced_schema,
    ccu.table_name as referenced_table,
    ccu.column_name as referenced_column,
    CASE 
        WHEN ccu.table_name = 'users' AND ccu.column_name = 'id' THEN '✅ Points to users.id (should be auth.uid())'
        WHEN ccu.table_name = 'user_profiles' AND ccu.column_name = 'id' THEN '❌ Points to user_profiles.id (profile ID - needs fix!)'
        WHEN ccu.table_name = 'user_profiles' AND ccu.column_name = 'auth_user_id' THEN '✅ Points to user_profiles.auth_user_id (equals auth.uid())'
        WHEN ccu.table_name = 'auth' AND ccu.table_name = 'users' THEN '✅ Points to auth.users.id (auth.uid())'
        ELSE '⚠️ Check this relationship'
    END as status
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage ccu 
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
AND tc.table_schema = 'public'
AND tc.table_name = 'advisor_mandates'
AND kcu.column_name = 'advisor_id';

-- 3. If no FK constraint exists, check data types to infer relationship
SELECT 
    'advisor_mandates advisor_id column info' as category,
    column_name,
    data_type,
    is_nullable,
    CASE 
        WHEN data_type = 'uuid' THEN '✅ UUID type (matches users.id and auth.uid())'
        ELSE '⚠️ Check data type'
    END as type_status
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'advisor_mandates'
AND column_name = 'advisor_id';

-- 4. Check if users.id matches auth.users.id (should be same)
SELECT 
    'users.id vs auth.users.id check' as category,
    COUNT(*) as total_users,
    COUNT(CASE WHEN au.id IS NOT NULL THEN 1 END) as users_with_auth_account,
    COUNT(CASE WHEN u.id = au.id THEN 1 END) as matching_ids,
    CASE 
        WHEN COUNT(CASE WHEN u.id = au.id THEN 1 END) = COUNT(*) THEN '✅ All users.id match auth.users.id'
        ELSE '⚠️ Some users.id do NOT match auth.users.id'
    END as status
FROM public.users u
LEFT JOIN auth.users au ON u.id = au.id;

-- 5. Sample data check - show a few advisor_mandates records
SELECT 
    'Sample advisor_mandates data' as category,
    id,
    advisor_id,
    name,
    created_at
FROM public.advisor_mandates
ORDER BY created_at DESC
LIMIT 5;



