-- FIX_STARTUP_USER_ID.sql
-- This script adds the missing user_id column to startups table
-- Run this in your Supabase SQL Editor

-- Step 1: Check if user_id column exists
SELECT 'Checking if user_id column exists in startups table:' as info;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'startups' 
AND table_schema = 'public'
AND column_name = 'user_id';

-- Step 2: Add user_id column if it doesn't exist
ALTER TABLE public.startups 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.users(id) ON DELETE CASCADE;

-- Step 3: Check current startups without user_id
SELECT 'Startups without user_id:' as info;
SELECT id, name, user_id, created_at
FROM public.startups 
WHERE user_id IS NULL;

-- Step 4: If there are startups without user_id, assign them to the first user
UPDATE public.startups 
SET user_id = (SELECT id FROM public.users WHERE role = 'Startup' LIMIT 1)
WHERE user_id IS NULL;

-- Step 5: Make user_id NOT NULL (only if all startups have user_id)
-- ALTER TABLE public.startups ALTER COLUMN user_id SET NOT NULL;

-- Step 6: Create index for better performance
CREATE INDEX IF NOT EXISTS idx_startups_user_id ON public.startups(user_id);

-- Step 7: Verify the fix
SELECT 'Verification - startups with user_id:' as info;
SELECT 
    s.id,
    s.name,
    s.user_id,
    u.email as user_email,
    s.created_at
FROM public.startups s
LEFT JOIN public.users u ON s.user_id = u.id
ORDER BY s.created_at DESC;
