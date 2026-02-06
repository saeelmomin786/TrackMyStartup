-- MIGRATION: Update facilitator_id from Auth User ID to Profile ID
-- Old Auth User ID: ad3ec5ce-5945-4c73-a562-2a0f3a8b08fd
-- New Profile ID:   d3fa5dca-ebf9-4570-b2c8-d5aa76a1c6b1

-- Step 1: Check how many questions need to be updated
SELECT 
  COUNT(*) as total_questions,
  COUNT(DISTINCT program_name) as programs_affected,
  STRING_AGG(DISTINCT program_name, ', ') as program_names
FROM incubation_program_questions
WHERE facilitator_id = 'ad3ec5ce-5945-4c73-a562-2a0f3a8b08fd';

-- Step 2: MIGRATE - Update all questions from Auth ID to Profile ID
UPDATE incubation_program_questions
SET facilitator_id = 'd3fa5dca-ebf9-4570-b2c8-d5aa76a1c6b1'
WHERE facilitator_id = 'ad3ec5ce-5945-4c73-a562-2a0f3a8b08fd';

-- Step 3: Verify migration was successful
SELECT 
  facilitator_id,
  program_name,
  COUNT(*) as question_count
FROM incubation_program_questions
WHERE facilitator_id = 'd3fa5dca-ebf9-4570-b2c8-d5aa76a1c6b1'
GROUP BY facilitator_id, program_name
ORDER BY program_name;

-- Step 4: Verify old ID no longer exists
SELECT COUNT(*) as remaining_questions
FROM incubation_program_questions
WHERE facilitator_id = 'ad3ec5ce-5945-4c73-a562-2a0f3a8b08fd';
-- Should return: 0
