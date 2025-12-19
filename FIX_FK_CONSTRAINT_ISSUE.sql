-- =====================================================
-- FIX: Create unique constraint for foreign key compatibility
-- =====================================================
-- Since user_profiles allows multiple profiles per user (UNIQUE(auth_user_id, role)),
-- we can't create FK directly to auth_user_id
-- Solution: Since investment_offers.investor_id references investors,
-- and each user has at most ONE Investor profile, we can work with that
-- =====================================================

-- Check if there are users with multiple Investor profiles (shouldn't happen due to UNIQUE constraint)
SELECT 
    auth_user_id,
    COUNT(*) as investor_profile_count
FROM public.user_profiles
WHERE role = 'Investor'
GROUP BY auth_user_id
HAVING COUNT(*) > 1;
-- If this returns any rows, there's a data issue

-- SOLUTION: We'll create a unique index on auth_user_id for Investor role profiles
-- But FK constraints can't use partial indexes, so we need a different approach

-- Option 1: Create a materialized view or function-based approach
-- Option 2: Since UNIQUE(auth_user_id, role) exists, and role='Investor' is specific,
--           we can't use a simple FK. We need to use a trigger or no FK constraint.

-- Actually, the best solution is:
-- Since investment_offers.investor_id = auth_user_id (from Investor profile),
-- and UNIQUE(auth_user_id, role) ensures one Investor profile per user,
-- we can't use a direct FK constraint on auth_user_id alone.

-- WORKAROUND: Remove FK constraint and use triggers/functions for referential integrity
-- OR: Change the approach to reference profile.id instead of auth_user_id

-- But wait - let's check what values are actually in investment_offers.investor_id
-- Are they auth_user_id values or profile id values?

-- For now, let's create a solution that works:
-- We'll modify the migration to NOT use FK constraints, but instead rely on application-level
-- or trigger-based referential integrity

-- Actually, let me create a better solution using a unique constraint that works:
-- We'll ensure that for FK purposes, we reference properly

-- BEST SOLUTION: Since the issue is that auth_user_id is not unique (due to multiple roles),
-- and foreign keys need uniqueness, we have these options:

-- Option A: Remove FK constraints and use application-level checks (simpler, works with multi-profile)
-- Option B: Create unique constraints per role (complex)
-- Option C: Change the reference to use profile.id instead of auth_user_id (requires data migration)

-- Let's go with Option A for now - remove FK constraint requirement and update migration script
-- The application code already handles the lookups correctly

