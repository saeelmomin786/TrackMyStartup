-- =====================================================
-- ADD SELECTION TYPE FOR MULTIPLE CHOICE QUESTIONS
-- =====================================================
-- This script adds a column to allow facilitators to specify
-- whether a multiple choice question should allow single or multiple selections
-- Run this in your Supabase SQL Editor
-- =====================================================

-- Add selection_type column to incubation_opportunity_questions
-- 'single' = select one option (dropdown/radio)
-- 'multiple' = select multiple options (checkbox)
-- NULL = use question's default type from question bank
ALTER TABLE public.incubation_opportunity_questions
ADD COLUMN IF NOT EXISTS selection_type TEXT CHECK (selection_type IN ('single', 'multiple'));

-- Add comment
COMMENT ON COLUMN public.incubation_opportunity_questions.selection_type IS 
'Override selection type for multiple choice questions: single (select one) or multiple (select multiple). NULL uses question default.';



