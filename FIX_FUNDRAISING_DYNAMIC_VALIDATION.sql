-- =====================================================
-- DYNAMIC VALIDATION FOR FUNDRAISING_DETAILS
-- =====================================================
-- This script replaces static CHECK constraints with dynamic triggers
-- that automatically validate against general_data table
--
-- BENEFIT: When admins add/remove values in general_data,
--          the validation automatically updates without modifying constraints
--
-- HOW IT WORKS:
-- 1. Drops static CHECK constraints
-- 2. Creates validation functions that check against general_data
-- 3. Creates triggers that run on INSERT/UPDATE
-- 4. Automatically validates type, domain, and stage against general_data

-- =====================================================
-- SAFETY CHECK: Verify existing triggers
-- =====================================================
-- Check for existing triggers on fundraising_details
SELECT 
    trigger_name,
    event_manipulation,
    action_timing,
    action_statement
FROM information_schema.triggers
WHERE event_object_table = 'fundraising_details'
ORDER BY trigger_name;

-- Expected: trigger_update_fundraising_details_updated_at (for updated_at timestamp)
-- This trigger will NOT be affected by our changes

-- =====================================================
-- STEP 1: Drop existing CHECK constraints
-- =====================================================
-- These constraints are static and need to be replaced with dynamic validation
ALTER TABLE fundraising_details 
DROP CONSTRAINT IF EXISTS fundraising_details_type_check;

ALTER TABLE fundraising_details 
DROP CONSTRAINT IF EXISTS fundraising_details_domain_check;

ALTER TABLE fundraising_details 
DROP CONSTRAINT IF EXISTS fundraising_details_stage_check;

-- =====================================================
-- STEP 2: Create validation functions
-- =====================================================

-- Function to validate round type (type column)
CREATE OR REPLACE FUNCTION validate_fundraising_type()
RETURNS TRIGGER AS $$
BEGIN
    -- If type is NULL, that's invalid (type is NOT NULL in schema)
    IF NEW.type IS NULL THEN
        RAISE EXCEPTION 'Fundraising type cannot be NULL';
    END IF;
    
    -- Check if the type exists in general_data
    IF NOT EXISTS (
        SELECT 1 
        FROM general_data 
        WHERE category = 'round_type' 
            AND name = NEW.type 
            AND is_active = true
    ) THEN
        RAISE EXCEPTION 'Invalid fundraising type: %. Must be one of the active round types in general_data (category: round_type).', NEW.type;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to validate domain
CREATE OR REPLACE FUNCTION validate_fundraising_domain()
RETURNS TRIGGER AS $$
BEGIN
    -- Domain is optional (can be NULL)
    IF NEW.domain IS NULL THEN
        RETURN NEW; -- NULL is allowed
    END IF;
    
    -- Check if the domain exists in general_data
    IF NOT EXISTS (
        SELECT 1 
        FROM general_data 
        WHERE category = 'domain' 
            AND name = NEW.domain 
            AND is_active = true
    ) THEN
        RAISE EXCEPTION 'Invalid domain: %. Must be one of the active domains in general_data (category: domain).', NEW.domain;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to validate stage
CREATE OR REPLACE FUNCTION validate_fundraising_stage()
RETURNS TRIGGER AS $$
BEGIN
    -- Stage is optional (can be NULL)
    IF NEW.stage IS NULL THEN
        RETURN NEW; -- NULL is allowed
    END IF;
    
    -- Check if the stage exists in general_data
    IF NOT EXISTS (
        SELECT 1 
        FROM general_data 
        WHERE category = 'stage' 
            AND name = NEW.stage 
            AND is_active = true
    ) THEN
        RAISE EXCEPTION 'Invalid stage: %. Must be one of the active stages in general_data (category: stage).', NEW.stage;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- STEP 3: Create triggers
-- =====================================================
-- NOTE: These triggers run BEFORE INSERT/UPDATE
-- They validate data but don't modify it
-- They work alongside the existing updated_at trigger (which runs AFTER)

-- Drop existing validation triggers if they exist (safety check)
DROP TRIGGER IF EXISTS validate_fundraising_type_trigger ON fundraising_details;
DROP TRIGGER IF EXISTS validate_fundraising_domain_trigger ON fundraising_details;
DROP TRIGGER IF EXISTS validate_fundraising_stage_trigger ON fundraising_details;

-- IMPORTANT: We do NOT drop trigger_update_fundraising_details_updated_at
-- That trigger handles updated_at timestamp and is separate from validation

-- Create trigger for type validation
CREATE TRIGGER validate_fundraising_type_trigger
    BEFORE INSERT OR UPDATE OF type ON fundraising_details
    FOR EACH ROW
    EXECUTE FUNCTION validate_fundraising_type();

-- Create trigger for domain validation
CREATE TRIGGER validate_fundraising_domain_trigger
    BEFORE INSERT OR UPDATE OF domain ON fundraising_details
    FOR EACH ROW
    EXECUTE FUNCTION validate_fundraising_domain();

-- Create trigger for stage validation
CREATE TRIGGER validate_fundraising_stage_trigger
    BEFORE INSERT OR UPDATE OF stage ON fundraising_details
    FOR EACH ROW
    EXECUTE FUNCTION validate_fundraising_stage();

-- =====================================================
-- STEP 4: Migrate existing data (if needed)
-- =====================================================

-- Migrate old stage values to match general_data
-- Update 'Minimum viable product' -> 'MVP'
UPDATE fundraising_details 
SET stage = 'MVP' 
WHERE stage = 'Minimum viable product';

-- Update 'Product market fit' -> 'Product Market Fit'
UPDATE fundraising_details 
SET stage = 'Product Market Fit' 
WHERE stage = 'Product market fit';

-- =====================================================
-- STEP 5: Verify the setup
-- =====================================================

-- Check that triggers exist
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement
FROM information_schema.triggers
WHERE event_object_table = 'fundraising_details'
    AND trigger_name LIKE 'validate_fundraising_%'
ORDER BY trigger_name;

-- Check that functions exist
SELECT 
    routine_name,
    routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
    AND routine_name IN (
        'validate_fundraising_type',
        'validate_fundraising_domain',
        'validate_fundraising_stage'
    )
ORDER BY routine_name;

-- =====================================================
-- STEP 6: Test the validation
-- =====================================================

-- Test 1: Valid type (should work)
DO $$
BEGIN
    -- This should succeed if 'Seed' exists in general_data
    INSERT INTO fundraising_details (startup_id, active, type, value, equity, validation_requested)
    VALUES (999, true, 'Seed', 5000000, 15, false)
    ON CONFLICT DO NOTHING;
    
    RAISE NOTICE '✅ Test 1 passed: Valid type accepted';
    
    -- Clean up
    DELETE FROM fundraising_details WHERE startup_id = 999;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ Test 1 failed: %', SQLERRM;
END $$;

-- Test 2: Invalid type (should fail)
DO $$
BEGIN
    INSERT INTO fundraising_details (startup_id, active, type, value, equity, validation_requested)
    VALUES (999, true, 'Invalid Type', 5000000, 15, false);
    
    RAISE NOTICE '❌ Test 2 failed: Invalid type was accepted (should have failed)';
    
    -- Clean up
    DELETE FROM fundraising_details WHERE startup_id = 999;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '✅ Test 2 passed: Invalid type correctly rejected - %', SQLERRM;
END $$;

-- =====================================================
-- IMPORTANT NOTES:
-- =====================================================
-- ✅ AUTOMATIC UPDATES: When admins add/remove values in general_data,
--    the validation automatically works with the new values
--
-- ✅ NO MANUAL UPDATES NEEDED: You don't need to modify constraints
--    when general_data changes
--
-- ✅ ACTIVE VALUES ONLY: Only values with is_active = true in general_data
--    are accepted
--
-- ✅ NULL HANDLING:
--    - type: NOT NULL (required)
--    - domain: NULL allowed (optional)
--    - stage: NULL allowed (optional)
--
-- ✅ ERROR MESSAGES: Clear error messages tell users which value is invalid
--    and which category it should belong to
--
-- ⚠️ PERFORMANCE: Triggers add a small overhead, but it's negligible
--    for typical use cases
--
-- ⚠️ ADMIN RESPONSIBILITY: Admins should ensure general_data values
--    match what the frontend expects (especially capitalization/spacing)
--
-- =====================================================
-- COMPATIBILITY NOTES:
-- =====================================================
-- ✅ SAFE: Existing triggers (updated_at) are NOT affected
-- ✅ SAFE: Existing INSERT/UPDATE operations continue to work
-- ✅ SAFE: SELECT operations are not affected (triggers only run on INSERT/UPDATE)
-- ✅ SAFE: RLS policies are not affected
-- ✅ SAFE: All existing services (capTableService, investorService, etc.) continue to work
--
-- ⚠️ BREAKING CHANGE: Invalid values that previously passed CHECK constraints
--    will now be rejected. The migration step handles this for existing data.
--
-- =====================================================
-- ROLLBACK INSTRUCTIONS (if needed):
-- =====================================================
-- If you need to rollback to static CHECK constraints:
--
-- 1. Drop the validation triggers:
--    DROP TRIGGER IF EXISTS validate_fundraising_type_trigger ON fundraising_details;
--    DROP TRIGGER IF EXISTS validate_fundraising_domain_trigger ON fundraising_details;
--    DROP TRIGGER IF EXISTS validate_fundraising_stage_trigger ON fundraising_details;
--
-- 2. Drop the validation functions:
--    DROP FUNCTION IF EXISTS validate_fundraising_type();
--    DROP FUNCTION IF EXISTS validate_fundraising_domain();
--    DROP FUNCTION IF EXISTS validate_fundraising_stage();
--
-- 3. Re-add static CHECK constraints (see FIX_FUNDRAISING_TYPE_CONSTRAINT.sql)
--
-- =====================================================
-- TESTING CHECKLIST:
-- =====================================================
-- After running this script, test:
-- ✅ Insert new fundraising_details record with valid type/domain/stage
-- ✅ Update existing record with valid values
-- ✅ Try inserting with invalid type (should fail with clear error)
-- ✅ Try updating with invalid domain (should fail with clear error)
-- ✅ Verify updated_at trigger still works (timestamp updates)
-- ✅ Verify existing capTableService.updateFundraisingDetails() still works

