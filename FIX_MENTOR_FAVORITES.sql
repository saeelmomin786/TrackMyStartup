-- Fix Mentor Favorites Persistence
-- This script updates RLS policies to allow mentors to save and load their own favorites
-- Run this in your Supabase SQL Editor

-- 1. Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Mentors can insert their own favorites" ON public.investor_favorites;
DROP POLICY IF EXISTS "Mentors can view their own favorites" ON public.investor_favorites;
DROP POLICY IF EXISTS "Mentors can delete their own favorites" ON public.investor_favorites;

-- 2. Create RLS policy to allow Mentors to insert their own favorites
CREATE POLICY "Mentors can insert their own favorites" 
ON public.investor_favorites
FOR INSERT 
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.user_profiles
        WHERE auth_user_id = auth.uid()
        AND role = 'Mentor'
    )
    AND investor_id = auth.uid()
);

-- 3. Create RLS policy to allow Mentors to view their own favorites
CREATE POLICY "Mentors can view their own favorites" 
ON public.investor_favorites
FOR SELECT 
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.user_profiles
        WHERE auth_user_id = auth.uid()
        AND role = 'Mentor'
    )
    AND investor_id = auth.uid()
);

-- 4. Create RLS policy to allow Mentors to delete their own favorites
CREATE POLICY "Mentors can delete their own favorites" 
ON public.investor_favorites
FOR DELETE 
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.user_profiles
        WHERE auth_user_id = auth.uid()
        AND role = 'Mentor'
    )
    AND investor_id = auth.uid()
);

-- Note: The column name is 'investor_id' but it can be used for mentors, investors, and investment advisors
-- since all are users with UUIDs. The RLS policies check the user's role in user_profiles to determine permissions.

