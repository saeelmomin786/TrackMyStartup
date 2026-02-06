-- DIAGNOSTIC: Check if questions are configured for "Investments by Track My Startup, real investor access, zero retainer"

-- Step 1: Check what program names exist in incubation_program_questions
SELECT DISTINCT program_name, COUNT(*) as question_count
FROM incubation_program_questions
GROUP BY program_name
ORDER BY program_name;

-- Step 2: Check specifically for the program mentioned
SELECT 
  ipq.id,
  ipq.program_name,
  ipq.question_id,
  ipq.is_required,
  ipq.display_order,
  ipq.selection_type,
  aqb.question_text
FROM incubation_program_questions ipq
LEFT JOIN application_question_bank aqb ON ipq.question_id = aqb.id
WHERE ipq.program_name = 'Investments by Track My Startup, real investor access, zero retainer'
ORDER BY ipq.display_order;

-- Step 3: Check all programs with their questions
SELECT 
  ipq.program_name,
  COUNT(*) as total_questions,
  STRING_AGG(DISTINCT ipq.question_id::text, ', ') as question_ids
FROM incubation_program_questions ipq
GROUP BY ipq.program_name
ORDER BY ipq.program_name;

-- Step 4: Verify program name length and special characters
SELECT 
  id,
  program_name,
  LENGTH(program_name) as length,
  MD5(program_name) as hash
FROM incubation_program_questions
ORDER BY program_name;

-- Step 5: CRITICAL - Check which facilitator_id owns the questions for this program
SELECT DISTINCT
  facilitator_id,
  program_name,
  COUNT(*) as question_count
FROM incubation_program_questions
WHERE program_name = 'Investments by Track My Startup, real investor access, zero retainer'
GROUP BY facilitator_id, program_name;

-- Step 6: Show all facilitator IDs and their programs
SELECT DISTINCT
  facilitator_id,
  program_name,
  COUNT(*) as question_count
FROM incubation_program_questions
GROUP BY facilitator_id, program_name
ORDER BY facilitator_id, program_name;
