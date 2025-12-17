-- =====================================================
-- CHECK ALL TABLES FOREIGN KEY RELATIONSHIPS
-- =====================================================
-- This script checks ALL tables to see what they reference:
-- - users.id (should be auth.uid()) ✅
-- - user_profiles.id (profile ID - problematic) ❌
-- - user_profiles.auth_user_id (equals auth.uid()) ✅
-- =====================================================

-- 1. All FK relationships to users.id (GOOD - will work with auth.uid())
SELECT 
    '✅ Tables with FK to users.id' as category,
    tc.table_name,
    kcu.column_name as fk_column,
    ccu.table_name as referenced_table,
    ccu.column_name as referenced_column,
    '✅ Will work with auth.uid()' as status
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage ccu 
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
AND tc.table_schema = 'public'
AND ccu.table_name = 'users'
AND ccu.column_name = 'id'
ORDER BY tc.table_name, kcu.column_name;

-- 2. All FK relationships to user_profiles.id (BAD - won't work with auth.uid())
SELECT 
    '❌ Tables with FK to user_profiles.id' as category,
    tc.table_name,
    kcu.column_name as fk_column,
    ccu.table_name as referenced_table,
    ccu.column_name as referenced_column,
    '❌ Needs fix - profile ID ≠ auth.uid()' as status
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage ccu 
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
AND tc.table_schema = 'public'
AND ccu.table_name = 'user_profiles'
AND ccu.column_name = 'id'
ORDER BY tc.table_name, kcu.column_name;

-- 3. All FK relationships to user_profiles.auth_user_id (GOOD - equals auth.uid())
SELECT 
    '✅ Tables with FK to user_profiles.auth_user_id' as category,
    tc.table_name,
    kcu.column_name as fk_column,
    ccu.table_name as referenced_table,
    ccu.column_name as referenced_column,
    '✅ Will work with auth.uid()' as status
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage ccu 
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
AND tc.table_schema = 'public'
AND ccu.table_name = 'user_profiles'
AND ccu.column_name = 'auth_user_id'
ORDER BY tc.table_name, kcu.column_name;

-- 4. Summary count
SELECT 
    'Summary' as category,
    COUNT(DISTINCT CASE 
        WHEN ccu.table_name = 'users' AND ccu.column_name = 'id' 
        THEN tc.table_name 
    END) as tables_with_fk_to_users_id,
    COUNT(DISTINCT CASE 
        WHEN ccu.table_name = 'user_profiles' AND ccu.column_name = 'id' 
        THEN tc.table_name 
    END) as tables_with_fk_to_profile_id,
    COUNT(DISTINCT CASE 
        WHEN ccu.table_name = 'user_profiles' AND ccu.column_name = 'auth_user_id' 
        THEN tc.table_name 
    END) as tables_with_fk_to_auth_user_id
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
);

-- 5. Tables with user-related columns but NO FK constraint (need manual check)
SELECT 
    '⚠️ Tables with user columns but no FK (need manual check)' as category,
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
AND (
    column_name LIKE '%user_id%'
    OR column_name LIKE '%advisor_id%'
    OR column_name LIKE '%investor_id%'
    OR column_name LIKE '%mentor_id%'
    OR column_name LIKE '%requester_id%'
    OR column_name LIKE '%sender_id%'
    OR column_name LIKE '%receiver_id%'
)
AND table_name NOT IN (
    -- Exclude tables that already have FK constraints (from queries above)
    SELECT DISTINCT tc.table_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu 
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema = 'public'
    AND (
        kcu.column_name LIKE '%user_id%'
        OR kcu.column_name LIKE '%advisor_id%'
        OR kcu.column_name LIKE '%investor_id%'
        OR kcu.column_name LIKE '%mentor_id%'
    )
)
AND data_type = 'uuid'  -- Only UUID columns (likely FK candidates)
ORDER BY table_name, column_name;

-- 6. Check advisor_mandates specifically
SELECT 
    'advisor_mandates specific check' as category,
    'advisor_id' as column_name,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.table_constraints tc
            JOIN information_schema.key_column_usage kcu 
                ON tc.constraint_name = kcu.constraint_name
            JOIN information_schema.constraint_column_usage ccu 
                ON ccu.constraint_name = tc.constraint_name
            WHERE tc.table_name = 'advisor_mandates'
            AND kcu.column_name = 'advisor_id'
            AND ccu.table_name = 'users'
            AND ccu.column_name = 'id'
        ) THEN '✅ Has FK to users.id'
        WHEN EXISTS (
            SELECT 1 FROM information_schema.table_constraints tc
            JOIN information_schema.key_column_usage kcu 
                ON tc.constraint_name = kcu.constraint_name
            JOIN information_schema.constraint_column_usage ccu 
                ON ccu.constraint_name = tc.constraint_name
            WHERE tc.table_name = 'advisor_mandates'
            AND kcu.column_name = 'advisor_id'
            AND ccu.table_name = 'user_profiles'
            AND ccu.column_name = 'id'
        ) THEN '❌ Has FK to user_profiles.id (needs fix)'
        WHEN EXISTS (
            SELECT 1 FROM information_schema.table_constraints tc
            JOIN information_schema.key_column_usage kcu 
                ON tc.constraint_name = kcu.constraint_name
            JOIN information_schema.constraint_column_usage ccu 
                ON ccu.constraint_name = tc.constraint_name
            WHERE tc.table_name = 'advisor_mandates'
            AND kcu.column_name = 'advisor_id'
            AND ccu.table_name = 'user_profiles'
            AND ccu.column_name = 'auth_user_id'
        ) THEN '✅ Has FK to user_profiles.auth_user_id'
        ELSE '⚠️ No FK constraint found (check manually)'
    END as status;





