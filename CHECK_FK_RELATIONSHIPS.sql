-- =====================================================
-- CHECK FOREIGN KEY RELATIONSHIPS
-- =====================================================
-- This script checks what tables reference users and how
-- =====================================================

-- 1. Check all FK relationships to users table
SELECT 
    'Foreign Keys to users table' as category,
    tc.table_name,
    kcu.column_name as fk_column,
    ccu.table_name as referenced_table,
    ccu.column_name as referenced_column,
    CASE 
        WHEN ccu.column_name = 'id' AND ccu.table_name = 'users' THEN '✅ Points to users.id (should be auth.uid())'
        WHEN ccu.column_name = 'id' AND ccu.table_name = 'auth.users' THEN '✅ Points to auth.users.id (auth.uid())'
        ELSE '⚠️ Check this'
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
AND (
    (ccu.table_name = 'users' AND ccu.column_name = 'id')
    OR (ccu.table_name = 'user_profiles' AND ccu.column_name = 'id')
    OR (ccu.table_name = 'user_profiles' AND ccu.column_name = 'auth_user_id')
)
ORDER BY tc.table_name, kcu.column_name;

-- 2. Check if users.id matches auth.users.id
SELECT 
    'users.id vs auth.users.id relationship' as category,
    COUNT(*) as total_users_in_users_table,
    COUNT(CASE WHEN au.id IS NOT NULL THEN 1 END) as users_with_auth_account,
    COUNT(CASE WHEN au.id IS NULL THEN 1 END) as users_without_auth_account
FROM public.users u
LEFT JOIN auth.users au ON u.id = au.id;

-- 3. Check user_profiles relationship
SELECT 
    'user_profiles relationship' as category,
    COUNT(*) as total_profiles,
    COUNT(DISTINCT auth_user_id) as unique_auth_users,
    COUNT(DISTINCT id) as unique_profile_ids,
    COUNT(CASE WHEN auth_user_id IS NOT NULL THEN 1 END) as profiles_with_auth_user_id
FROM public.user_profiles;

-- 4. Check advisor_mandates table structure (only relevant columns)
SELECT 
    'advisor_mandates table structure' as category,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'advisor_mandates'
AND (
    column_name LIKE '%advisor%' 
    OR column_name LIKE '%user%' 
    OR column_name = 'id'
)
ORDER BY ordinal_position;

-- 5. Show actual FK constraint for advisor_mandates
SELECT 
    'advisor_mandates FK constraint' as category,
    tc.constraint_name,
    kcu.column_name as fk_column,
    ccu.table_name as referenced_table,
    ccu.column_name as referenced_column
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage ccu 
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
AND tc.table_schema = 'public'
AND tc.table_name = 'advisor_mandates';

