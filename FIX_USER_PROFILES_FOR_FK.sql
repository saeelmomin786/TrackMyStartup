-- =====================================================
-- FIX: Add unique constraint for foreign key compatibility
-- =====================================================
-- Since one user can have multiple profiles (roles), we need to handle this
-- For foreign keys, we'll create a unique index on auth_user_id + role for the primary role
-- OR reference a specific role's profile
-- =====================================================

-- Option 1: If investor_id in investment_offers should point to Investor profile specifically
-- We need to check what role the investor_id represents

-- First, let's check if we can create a unique partial index for Investor role
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_profiles_auth_user_id_investor 
ON public.user_profiles(auth_user_id) 
WHERE role = 'Investor';

-- This allows FK to reference investor profiles specifically
-- But wait, the FK constraint needs to reference the exact column...

-- Actually, the issue is that auth_user_id is not unique because one user can have multiple roles
-- But investment_offers.investor_id contains auth_user_id (not profile id)

-- SOLUTION: Create a unique constraint on auth_user_id IF we only allow one profile per user
-- OR create a view/function that gets the "primary" profile

-- Let's check what's actually needed:
-- If investment_offers.investor_id = auth_user_id, and we want FK to user_profiles
-- We need auth_user_id to be unique OR we need to reference differently

-- Actually, I think the best solution is:
-- Since investment_offers is for investors, we should reference the Investor profile specifically
-- But FK constraints can't use WHERE clauses directly

-- BETTER SOLUTION: Use a composite unique constraint or create a unique index that makes sense

-- Check current constraint
SELECT 
    conname as constraint_name,
    contype as constraint_type
FROM pg_constraint 
WHERE conrelid = 'public.user_profiles'::regclass
AND contype = 'u';

-- Option 2: If we want to allow multiple profiles but FK to work, we need:
-- Either make auth_user_id unique (one profile per user - breaks multi-profile)
-- OR change the FK to reference profile id instead of auth_user_id
-- OR create a unique constraint for the specific use case

-- For now, let's try adding a unique constraint on (auth_user_id, role) 
-- and see if that helps, but that still won't work for FK...

-- ACTUAL SOLUTION: We need to either:
-- 1. Make auth_user_id unique (if one profile per user is acceptable)
-- 2. OR change the foreign key to reference a computed/functional approach
-- 3. OR create a view that has unique auth_user_id

-- Let me create a solution that adds unique constraint on auth_user_id
-- This assumes one primary profile per user (which might be the case for investors)

-- Check if there are users with multiple profiles
SELECT 
    auth_user_id,
    COUNT(*) as profile_count
FROM public.user_profiles
GROUP BY auth_user_id
HAVING COUNT(*) > 1;

-- If users have multiple profiles, we need different approach

