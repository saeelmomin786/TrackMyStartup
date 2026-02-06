-- ⚠️ COMPREHENSIVE MIGRATION: Update ALL facilitator_id fields to use Auth User ID
-- 
-- Issue: Some tables created with Profile ID, code now uses Auth User ID everywhere
-- 
-- Old Profile ID:  d3fa5dca-ebf9-4570-b2c8-d5aa76a1c6b1 (remove from all tables)
-- New Auth ID:     ad3ec5ce-5945-4c73-a562-2a0f3a8b08fd (standardize to this)

-- ============================================================
-- STEP 1: CHECK CURRENT STATE
-- ============================================================

-- Check reports_mandate
SELECT 'reports_mandate' as table_name, facilitator_id, COUNT(*) as count
FROM reports_mandate
GROUP BY facilitator_id;

-- Check incubation_program_questions
SELECT 'incubation_program_questions' as table_name, facilitator_id, COUNT(*) as count
FROM incubation_program_questions
GROUP BY facilitator_id;

-- Check program_tracking_responses (if exists)
SELECT 'program_tracking_responses' as table_name, facilitator_id, COUNT(*) as count
FROM program_tracking_responses
GROUP BY facilitator_id;

-- ============================================================
-- STEP 2: MIGRATE - Update Profile ID to Auth ID
-- ============================================================

-- Migrate reports_mandate
UPDATE reports_mandate
SET facilitator_id = 'ad3ec5ce-5945-4c73-a562-2a0f3a8b08fd'
WHERE facilitator_id = 'd3fa5dca-ebf9-4570-b2c8-d5aa76a1c6b1';

-- Migrate incubation_program_questions  
UPDATE incubation_program_questions
SET facilitator_id = 'ad3ec5ce-5945-4c73-a562-2a0f3a8b08fd'
WHERE facilitator_id = 'd3fa5dca-ebf9-4570-b2c8-d5aa76a1c6b1';

-- Migrate program_tracking_responses (if exists)
UPDATE program_tracking_responses
SET facilitator_id = 'ad3ec5ce-5945-4c73-a562-2a0f3a8b08fd'
WHERE facilitator_id = 'd3fa5dca-ebf9-4570-b2c8-d5aa76a1c6b1';

-- ============================================================
-- STEP 3: VERIFY MIGRATION SUCCESS
-- ============================================================

-- Verify reports_mandate
SELECT 'reports_mandate AFTER' as status, facilitator_id, COUNT(*) as count
FROM reports_mandate
WHERE facilitator_id = 'ad3ec5ce-5945-4c73-a562-2a0f3a8b08fd'
GROUP BY facilitator_id;

-- Verify incubation_program_questions
SELECT 'incubation_program_questions AFTER' as status, facilitator_id, COUNT(*) as count
FROM incubation_program_questions
WHERE facilitator_id = 'ad3ec5ce-5945-4c73-a562-2a0f3a8b08fd'
GROUP BY facilitator_id;

-- Verify program_tracking_responses
SELECT 'program_tracking_responses AFTER' as status, facilitator_id, COUNT(*) as count
FROM program_tracking_responses
WHERE facilitator_id = 'ad3ec5ce-5945-4c73-a562-2a0f3a8b08fd'
GROUP BY facilitator_id;

-- ============================================================
-- STEP 4: VERIFY NO OLD PROFILE IDs REMAIN
-- ============================================================

-- Should all return 0
SELECT COUNT(*) as remaining_in_reports_mandate
FROM reports_mandate
WHERE facilitator_id = 'd3fa5dca-ebf9-4570-b2c8-d5aa76a1c6b1';

SELECT COUNT(*) as remaining_in_program_questions
FROM incubation_program_questions
WHERE facilitator_id = 'd3fa5dca-ebf9-4570-b2c8-d5aa76a1c6b1';

SELECT COUNT(*) as remaining_in_tracking_responses
FROM program_tracking_responses
WHERE facilitator_id = 'd3fa5dca-ebf9-4570-b2c8-d5aa76a1c6b1';

-- ============================================================
-- RESULT: All systems now use Auth User ID consistently! ✅
-- ============================================================
