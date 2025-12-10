-- =====================================================
-- UPDATE FUNDRAISING TYPE CONSTRAINT
-- =====================================================
-- This script updates the CHECK constraint on fundraising_details.type
-- to match all values from the general_data table (round_type category)
--
-- ISSUE: The constraint only allows: 'Pre-Seed', 'Seed', 'Series A', 'Series B', 'Bridge'
-- But general_data has: 'Pre-Seed', 'Seed', 'Series A', 'Series B', 'Series C', 'Series D+', 'Bridge', 'Growth'
--
-- SOLUTION: Update the constraint to dynamically include all active values from general_data

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

-- 3. Drop the existing constraint
ALTER TABLE fundraising_details 
DROP CONSTRAINT IF EXISTS fundraising_details_type_check;

-- 4. Create a new constraint that accepts all values from general_data
-- Note: PostgreSQL CHECK constraints cannot reference other tables,
-- so we list all the values explicitly based on what's in general_data
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

-- 5. Verify the new constraint
SELECT 
    conname,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'fundraising_details'::regclass 
    AND conname = 'fundraising_details_type_check';

-- 6. Check if there are any existing rows with invalid type values
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

-- 7. If there are invalid values, you may need to update them
-- Example: Update 'Series C' if it exists but wasn't in the old constraint
-- UPDATE fundraising_details 
-- SET type = 'Series B'  -- or another valid value
-- WHERE type NOT IN (
--     SELECT name 
--     FROM general_data 
--     WHERE category = 'round_type' 
--         AND is_active = true
-- );

-- =====================================================
-- ALTERNATIVE: Dynamic Validation via Trigger
-- =====================================================
-- If you want the constraint to automatically validate against general_data
-- (so admins can add new round types without updating the constraint),
-- you can use a trigger instead:

-- Step 1: Drop the CHECK constraint (we'll use a trigger instead)
-- ALTER TABLE fundraising_details DROP CONSTRAINT IF EXISTS fundraising_details_type_check;

-- Step 2: Create a function to validate type against general_data
CREATE OR REPLACE FUNCTION validate_fundraising_type()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if the type exists in general_data
    IF NOT EXISTS (
        SELECT 1 
        FROM general_data 
        WHERE category = 'round_type' 
            AND name = NEW.type 
            AND is_active = true
    ) THEN
        RAISE EXCEPTION 'Invalid fundraising type: %. Must be one of the active round types in general_data.', NEW.type;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 3: Create trigger to validate on INSERT and UPDATE
-- DROP TRIGGER IF EXISTS validate_fundraising_type_trigger ON fundraising_details;
-- CREATE TRIGGER validate_fundraising_type_trigger
--     BEFORE INSERT OR UPDATE OF type ON fundraising_details
--     FOR EACH ROW
--     EXECUTE FUNCTION validate_fundraising_type();

-- NOTE: Choose ONE approach:
-- Option A: Use CHECK constraint (simpler, but needs manual updates when new types are added)
-- Option B: Use Trigger (dynamic, automatically validates against general_data)

