-- Check current RLS policies on incubation_program_questions table

-- Show all policies on the table
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'incubation_program_questions'
ORDER BY policyname;

-- Check if RLS is enabled on the table
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE tablename = 'incubation_program_questions';

-- Count total rows in the table
SELECT COUNT(*) as total_questions
FROM public.incubation_program_questions;

-- Show sample questions
SELECT 
  id,
  program_name,
  facilitator_id,
  question_id,
  display_order,
  is_required
FROM public.incubation_program_questions
LIMIT 10;
