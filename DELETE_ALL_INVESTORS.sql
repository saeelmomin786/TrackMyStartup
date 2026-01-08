-- DELETE_ALL_INVESTORS.sql
-- This script provides options to delete all investors from the investor_list table

-- OPTION 1: Hard Delete (Permanently removes all records)
-- WARNING: This will permanently delete all investors and cannot be undone!
-- Uncomment the line below to execute:
-- DELETE FROM public.investor_list;

-- OPTION 2: Soft Delete (Sets is_active = false for all records)
-- This is safer as it marks all investors as inactive but keeps the data
-- Uncomment the line below to execute:
-- UPDATE public.investor_list SET is_active = false, updated_at = NOW();

-- OPTION 3: Delete only inactive investors (if you want to clean up)
-- DELETE FROM public.investor_list WHERE is_active = false;

-- OPTION 4: Delete all and reset the sequence (if you want to start fresh with ID 1)
-- DELETE FROM public.investor_list;
-- ALTER SEQUENCE public.investor_list_id_seq RESTART WITH 1;

-- Verify the deletion (check how many records remain)
SELECT COUNT(*) as total_investors FROM public.investor_list;
SELECT COUNT(*) as active_investors FROM public.investor_list WHERE is_active = true;
SELECT COUNT(*) as inactive_investors FROM public.investor_list WHERE is_active = false;


