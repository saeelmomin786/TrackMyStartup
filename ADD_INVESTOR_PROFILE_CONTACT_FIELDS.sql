-- Add contact fields to investor_profiles table
-- Run this if the table already exists

ALTER TABLE public.investor_profiles
ADD COLUMN IF NOT EXISTS website TEXT,
ADD COLUMN IF NOT EXISTS linkedin_link TEXT,
ADD COLUMN IF NOT EXISTS email TEXT;

-- Add comments for the new columns
COMMENT ON COLUMN public.investor_profiles.website IS 'Investor or firm website URL';
COMMENT ON COLUMN public.investor_profiles.linkedin_link IS 'LinkedIn profile or company page URL';
COMMENT ON COLUMN public.investor_profiles.email IS 'Contact email address (optional, separate from user email)';

