-- =====================================================
-- CLEAR EXISTING REQUEST MESSAGES
-- =====================================================
-- This script clears all existing messages from investor_connection_requests table
-- This removes the default messages that were previously sent

-- Update all records to set message to NULL
UPDATE public.investor_connection_requests
SET message = NULL
WHERE message IS NOT NULL;

-- Verify the update
SELECT 
    COUNT(*) as total_requests,
    COUNT(message) as requests_with_messages,
    COUNT(*) - COUNT(message) as requests_without_messages
FROM public.investor_connection_requests;










