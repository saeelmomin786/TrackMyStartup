-- =====================================================
-- ADD MENTOR SIGNED AGREEMENT COLUMN
-- =====================================================
-- This adds a column to store the mentor's signed agreement
-- Run this in Supabase SQL Editor
-- =====================================================

-- Add mentor_signed_agreement_url column
ALTER TABLE public.mentor_startup_assignments
ADD COLUMN IF NOT EXISTS mentor_signed_agreement_url TEXT;

-- Add mentor_signed_agreement_uploaded_at timestamp
ALTER TABLE public.mentor_startup_assignments
ADD COLUMN IF NOT EXISTS mentor_signed_agreement_uploaded_at TIMESTAMP WITH TIME ZONE;

-- Update agreement_status check constraint to include 'pending_mentor_signature'
ALTER TABLE public.mentor_startup_assignments
DROP CONSTRAINT IF EXISTS mentor_startup_assignments_agreement_status_check;

ALTER TABLE public.mentor_startup_assignments
ADD CONSTRAINT mentor_startup_assignments_agreement_status_check 
CHECK (agreement_status IN ('pending_upload', 'pending_mentor_approval', 'pending_mentor_signature', 'approved', 'rejected'));

-- Verify the columns were added
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'mentor_startup_assignments'
AND column_name IN ('mentor_signed_agreement_url', 'mentor_signed_agreement_uploaded_at')
ORDER BY column_name;
