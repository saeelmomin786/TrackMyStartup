-- =====================================================
-- FIX MENTOR FEE_TYPE CONSTRAINT
-- =====================================================
-- This script fixes the CHECK constraint error by updating it to match
-- the values used in the MentorView.tsx form component
--
-- PROBLEM: Constraint only allows: 'Fees', 'Equity', 'Hybrid', 'Pro Bono'
-- But form uses: 'Free', 'Fees', 'Stock Options', 'Hybrid'
--
-- SOLUTION: Update constraint to include 'Free' and 'Stock Options',
-- and allow NULL for empty selection
-- =====================================================

-- 1. Check current constraint
SELECT 
    conname,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'mentor_profiles'::regclass 
    AND conname LIKE '%fee_type%';

-- 2. Check for any existing rows with invalid fee_type values
SELECT 
    id,
    user_id,
    fee_type,
    created_at
FROM mentor_profiles
WHERE fee_type IS NOT NULL 
    AND fee_type NOT IN ('Free', 'Fees', 'Stock Options', 'Hybrid');

-- 3. Update any existing data to match new constraint
-- Map old values to new values
UPDATE mentor_profiles
SET fee_type = CASE 
    WHEN fee_type = 'Equity' THEN 'Stock Options'
    WHEN fee_type = 'Pro Bono' THEN 'Free'
    ELSE fee_type
END
WHERE fee_type IN ('Equity', 'Pro Bono');

-- 4. Drop the existing constraint (if it exists)
ALTER TABLE mentor_profiles 
DROP CONSTRAINT IF EXISTS mentor_profiles_fee_type_check;

-- 5. Create a new constraint that matches the form values
-- Allow NULL, 'Free', 'Fees', 'Stock Options', 'Hybrid'
ALTER TABLE mentor_profiles 
ADD CONSTRAINT mentor_profiles_fee_type_check 
CHECK (
    fee_type IS NULL 
    OR fee_type IN ('Free', 'Fees', 'Stock Options', 'Hybrid')
);

-- 6. Verify the new constraint
SELECT 
    conname,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'mentor_profiles'::regclass 
    AND conname = 'mentor_profiles_fee_type_check';

-- =====================================================
-- NOTES:
-- =====================================================
-- 1. The constraint now allows NULL (for empty selection)
-- 2. Values match exactly what the form sends: 'Free', 'Fees', 'Stock Options', 'Hybrid'
-- 3. Old values ('Equity', 'Pro Bono') are automatically migrated to new values
-- =====================================================

