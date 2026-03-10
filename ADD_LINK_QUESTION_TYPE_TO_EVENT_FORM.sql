-- =====================================================
-- ADD LINK QUESTION TYPE TO EVENT FORM QUESTIONS
-- =====================================================
-- Run in Supabase SQL Editor.

BEGIN;

ALTER TABLE public.event_form_questions
DROP CONSTRAINT IF EXISTS event_form_questions_question_type_check;

ALTER TABLE public.event_form_questions
ADD CONSTRAINT event_form_questions_question_type_check
CHECK (
  question_type IN (
    'short_text',
    'long_text',
    'email',
    'link',
    'phone',
    'number',
    'dropdown',
    'radio',
    'checkbox',
    'date',
    'file_upload'
  )
);

COMMIT;
