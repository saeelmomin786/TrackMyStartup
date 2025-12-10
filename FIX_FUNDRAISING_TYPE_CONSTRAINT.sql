-- =====================================================
-- FIX FUNDRAISING TYPE CONSTRAINT
-- =====================================================
-- This script fixes the CHECK constraint error by updating it to include
-- all round types from the general_data table
--
-- PROBLEM: Constraint only allows: 'Pre-Seed', 'Seed', 'Series A', 'Series B', 'Bridge'
-- But general_data has: 'Pre-Seed', 'Seed', 'Series A', 'Series B', 'Series C', 'Series D+', 'Bridge', 'Growth'
--
-- SOLUTION: Update constraint to include all values from general_data

-- 1. Check current constraint
SELECT 
    conname,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'fundraising_details'::regclass 
    AND conname = 'fundraising_details_type_check';

-- 2. Get all active round_type values from general_data
SELECT 
    name as round_type_value,
    display_order
FROM general_data
WHERE category = 'round_type'
    AND is_active = true
ORDER BY display_order, name;

-- 3. Check for any existing rows with invalid type values
SELECT 
    id,
    startup_id,
    type,
    active,
    created_at
FROM fundraising_details
WHERE type NOT IN (
    SELECT name 
    FROM general_data 
    WHERE category = 'round_type' 
        AND is_active = true
);

-- 4. Drop the existing constraint
ALTER TABLE fundraising_details 
DROP CONSTRAINT IF EXISTS fundraising_details_type_check;

-- 5. Create a new constraint with all values from general_data
ALTER TABLE fundraising_details 
ADD CONSTRAINT fundraising_details_type_check 
CHECK (
    type IN (
        'Pre-Seed',
        'Seed',
        'Series A',
        'Series B',
        'Series C',
        'Series D+',
        'Bridge',
        'Growth'
    )
);

-- 6. Verify the new constraint
SELECT 
    conname,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'fundraising_details'::regclass 
    AND conname = 'fundraising_details_type_check';

-- =====================================================
-- FIX DOMAIN CONSTRAINT
-- =====================================================
-- 8. Check current domain constraint
SELECT 
    conname,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'fundraising_details'::regclass 
    AND conname = 'fundraising_details_domain_check';

-- 9. Get all active domain values from general_data
SELECT 
    name as domain_value,
    display_order
FROM general_data
WHERE category = 'domain'
    AND is_active = true
ORDER BY display_order, name;

-- 10. Drop existing domain constraint
ALTER TABLE fundraising_details 
DROP CONSTRAINT IF EXISTS fundraising_details_domain_check;

-- 11. Create new domain constraint with all values from general_data
ALTER TABLE fundraising_details 
ADD CONSTRAINT fundraising_details_domain_check 
CHECK (
    domain IS NULL OR domain IN (
        'Agriculture',
        'AI',
        'Climate',
        'Consumer Goods',
        'Defence',
        'E-commerce',
        'Education',
        'EV',
        'Finance',
        'Food & Beverage',
        'Healthcare',
        'Manufacturing',
        'Media & Entertainment',
        'Others',
        'PaaS',
        'Renewable Energy',
        'Retail',
        'SaaS',
        'Social Impact',
        'Space',
        'Transportation and Logistics',
        'Waste Management',
        'Web 3.0'
    )
);

-- =====================================================
-- FIX STAGE CONSTRAINT
-- =====================================================
-- 12. Check current stage constraint
SELECT 
    conname,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'fundraising_details'::regclass 
    AND conname = 'fundraising_details_stage_check';

-- 13. Get all active stage values from general_data
SELECT 
    name as stage_value,
    display_order
FROM general_data
WHERE category = 'stage'
    AND is_active = true
ORDER BY display_order, name;

-- 14. Drop existing stage constraint
ALTER TABLE fundraising_details 
DROP CONSTRAINT IF EXISTS fundraising_details_stage_check;

-- 15. Migrate old stage values to match general_data
-- Update 'Minimum viable product' -> 'MVP'
UPDATE fundraising_details 
SET stage = 'MVP' 
WHERE stage = 'Minimum viable product';

-- Update 'Product market fit' -> 'Product Market Fit'
UPDATE fundraising_details 
SET stage = 'Product Market Fit' 
WHERE stage = 'Product market fit';

-- 16. Create new stage constraint with all values from general_data
-- Note: general_data has 'MVP' and 'Product Market Fit' (different from old enum)
ALTER TABLE fundraising_details 
ADD CONSTRAINT fundraising_details_stage_check 
CHECK (
    stage IS NULL OR stage IN (
        'Ideation',
        'Proof of Concept',
        'MVP',
        'Product Market Fit',
        'Scaling'
    )
);

-- 17. Verify all constraints
SELECT 
    conname,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'fundraising_details'::regclass 
    AND conname IN (
        'fundraising_details_type_check',
        'fundraising_details_domain_check',
        'fundraising_details_stage_check'
    )
ORDER BY conname;

-- =====================================================
-- IMPORTANT NOTES:
-- =====================================================
-- 1. If admins add new values via General Data Manager,
--    you'll need to update these constraints manually
--
-- 2. For automatic validation (recommended for production),
--    see UPDATE_FUNDRAISING_TYPE_CONSTRAINT.sql for a trigger-based approach
--
-- 3. Make sure all existing fundraising_details values
--    match one of the values in the constraints above
--
-- 4. Stage values in general_data are:
--    - 'MVP' (not 'Minimum viable product')
--    - 'Product Market Fit' (not 'Product market fit')
--    Make sure your frontend uses the exact values from general_data
--
-- 5. Stage value migration (automatically handled above):
--    - 'Minimum viable product' -> 'MVP'
--    - 'Product market fit' -> 'Product Market Fit'
--    Existing data is automatically migrated in step 15

