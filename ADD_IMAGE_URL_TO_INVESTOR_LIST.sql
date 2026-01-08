-- =====================================================
-- ADD IMAGE_URL COLUMN TO INVESTOR_LIST TABLE
-- =====================================================
-- This script adds the image_url column to the existing investor_list table
-- Run this if the table already exists and you need to add the image_url field

ALTER TABLE IF EXISTS public.investor_list 
ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Add comment
COMMENT ON COLUMN public.investor_list.image_url IS 'Investor logo/image URL for display in startup dashboard';


