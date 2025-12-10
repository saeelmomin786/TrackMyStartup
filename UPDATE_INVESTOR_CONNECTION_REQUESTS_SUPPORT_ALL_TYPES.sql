-- =====================================================
-- UPDATE INVESTOR CONNECTION REQUESTS TABLE
-- =====================================================
-- PURPOSE: Update the existing investor_connection_requests table to support
--          all collaborator types (Mentor, CA, CS, Incubator, etc.) not just
--          'Startup' and 'Investment Advisor'
--
-- USAGE: Run this to update the table constraint to allow all collaborator types
--        This is needed for the Collaboration tab to show all non-startup requests

-- Drop the old constraint that only allows 'Startup' and 'Investment Advisor'
ALTER TABLE public.investor_connection_requests 
DROP CONSTRAINT IF EXISTS investor_connection_requests_requester_type_check;

-- Add new constraint that allows all collaborator types
-- This allows: Startup, Investment Advisor, Mentor, CA, CS, Incubator, and any future types
ALTER TABLE public.investor_connection_requests 
ADD CONSTRAINT investor_connection_requests_requester_type_check 
CHECK (requester_type IS NOT NULL AND requester_type != '');

-- Add profile URL fields for other collaborator types (if not already exists)
-- Note: advisor_profile_url already exists, but we can use it for all non-startup types
-- Or add a generic profile_url field

-- Add generic profile_url field for any collaborator type
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'investor_connection_requests' 
        AND column_name = 'profile_url'
    ) THEN
        ALTER TABLE public.investor_connection_requests 
        ADD COLUMN profile_url TEXT;
    END IF;
END $$;

-- Add mentor_profile_url, ca_profile_url, cs_profile_url, incubator_profile_url if needed
-- Or we can use advisor_profile_url for all non-startup types (simpler approach)
-- For now, we'll use advisor_profile_url for all non-startup collaborator types

-- Verify the update
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'investor_connection_requests'
ORDER BY ordinal_position;



