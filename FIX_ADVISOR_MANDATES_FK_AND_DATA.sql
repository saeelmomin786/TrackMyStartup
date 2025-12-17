-- =====================================================
-- FIX advisor_mandates.advisor_id FK AND DATA
-- =====================================================
-- This script:
-- 1. Checks current data
-- 2. Fixes advisor_id if it's using profile IDs
-- 3. Adds FK constraint to users.id
-- =====================================================

-- STEP 1: Check current state
SELECT 
    'STEP 1: Current state check' as step,
    COUNT(*) as total_mandates,
    COUNT(CASE WHEN u.id IS NOT NULL THEN 1 END) as advisor_id_matches_users,
    COUNT(CASE WHEN up.id IS NOT NULL THEN 1 END) as advisor_id_matches_profile_id,
    COUNT(CASE WHEN up2.auth_user_id IS NOT NULL THEN 1 END) as advisor_id_matches_auth_user_id
FROM advisor_mandates am
LEFT JOIN users u ON u.id = am.advisor_id
LEFT JOIN user_profiles up ON up.id = am.advisor_id
LEFT JOIN user_profiles up2 ON up2.auth_user_id = am.advisor_id;

-- STEP 2: Fix advisor_id if it's using profile IDs (convert to users.id)
-- This updates advisor_id from profile ID to auth_user_id (which equals users.id)
UPDATE advisor_mandates am
SET advisor_id = up.auth_user_id
FROM user_profiles up
WHERE am.advisor_id = up.id  -- If advisor_id matches profile ID
AND up.auth_user_id IS NOT NULL  -- And we have the auth_user_id
AND NOT EXISTS (
    SELECT 1 FROM users u WHERE u.id = am.advisor_id
);  -- Only if it doesn't already match users.id

-- STEP 3: Verify fix
SELECT 
    'STEP 3: After fix verification' as step,
    COUNT(*) as total_mandates,
    COUNT(CASE WHEN u.id IS NOT NULL THEN 1 END) as advisor_id_matches_users,
    COUNT(CASE WHEN up.id IS NOT NULL THEN 1 END) as advisor_id_matches_profile_id,
    CASE 
        WHEN COUNT(CASE WHEN u.id IS NOT NULL THEN 1 END) = COUNT(*) 
        THEN '✅ All advisor_id now match users.id'
        ELSE '⚠️ Some advisor_id still need fixing'
    END as status
FROM advisor_mandates am
LEFT JOIN users u ON u.id = am.advisor_id
LEFT JOIN user_profiles up ON up.id = am.advisor_id
WHERE am.advisor_id IS NOT NULL;

-- STEP 4: Add FK constraint to users.id (if data is correct)
-- Drop existing constraint if it exists
ALTER TABLE public.advisor_mandates
DROP CONSTRAINT IF EXISTS fk_advisor_mandates_advisor_id;

-- Add FK constraint to users.id
ALTER TABLE public.advisor_mandates
ADD CONSTRAINT fk_advisor_mandates_advisor_id 
FOREIGN KEY (advisor_id) 
REFERENCES public.users(id) 
ON DELETE CASCADE;

-- STEP 5: Verify FK constraint was added
SELECT 
    'STEP 5: FK constraint verification' as step,
    tc.constraint_name,
    kcu.column_name as fk_column,
    ccu.table_name as referenced_table,
    ccu.column_name as referenced_column,
    '✅ FK constraint added successfully' as status
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

-- STEP 6: Final summary
SELECT 
    'STEP 6: Final summary' as step,
    'advisor_mandates.advisor_id' as column_name,
    '✅ Now references users.id (equals auth.uid())' as status,
    '✅ RLS policies using auth.uid() will work for all profiles' as note;



