-- =====================================================
-- ADD DISPLAY ORDER TO QUESTION BANK
-- =====================================================
-- This script adds a display_order field to the question bank
-- so admins can control the order in which questions appear
-- Run this in your Supabase SQL Editor
-- =====================================================

-- Add display_order column if it doesn't exist
ALTER TABLE public.application_question_bank 
ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0;

-- Create index for faster ordering
CREATE INDEX IF NOT EXISTS idx_question_bank_display_order 
ON public.application_question_bank(display_order);

-- Set initial display_order based on created_at for existing questions
-- This ensures existing questions have a proper order
UPDATE public.application_question_bank
SET display_order = subquery.row_number - 1
FROM (
    SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC) as row_number
    FROM public.application_question_bank
) AS subquery
WHERE public.application_question_bank.id = subquery.id;

-- Verify the column was added
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'application_question_bank'
AND column_name = 'display_order';


