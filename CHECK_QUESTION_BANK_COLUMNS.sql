-- Check the actual column names in application_question_bank
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'application_question_bank'
  AND column_name LIKE '%question%'
ORDER BY ordinal_position;

-- Check if the join is working
SELECT 
    f2q.id,
    f2q.question_id,
    aqb.id as bank_id,
    aqb.question,  -- This might be 'question' not 'question_text'
    aqb.question_category
FROM incubation_opportunity_form2_questions f2q
LEFT JOIN application_question_bank aqb ON aqb.id = f2q.question_id
WHERE f2q.opportunity_id = '60437153-aa15-4c74-88b5-135d6d7afcfd'
LIMIT 3;
