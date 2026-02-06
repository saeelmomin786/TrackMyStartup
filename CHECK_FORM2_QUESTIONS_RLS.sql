-- Check RLS policies on incubation_opportunity_form2_questions
SELECT * FROM pg_policies 
WHERE tablename = 'incubation_opportunity_form2_questions'
ORDER BY policyname;

-- Try to manually insert a test question for the opportunity
-- Replace values with real data from your database
INSERT INTO incubation_opportunity_form2_questions 
  (opportunity_id, question_id, is_required, display_order)
VALUES 
  ('1edcb779-378c-485a-8d01-9a0564f2b00f', '1', true, 0)
RETURNING *;

-- Then check if it was inserted
SELECT * FROM incubation_opportunity_form2_questions
WHERE opportunity_id = '1edcb779-378c-485a-8d01-9a0564f2b00f';
