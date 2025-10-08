-- Fix RLS policies for due diligence document uploads
-- Run this in your Supabase SQL editor

-- Step 1: Check current RLS policies on opportunity_applications
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'opportunity_applications'
ORDER BY policyname;

-- Step 2: Check if RLS is enabled
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE tablename = 'opportunity_applications';

-- Step 3: Create or update RLS policy to allow startups to update their own applications
-- This policy allows startups to update opportunity_applications where they are the startup_id

-- First, drop existing policy if it exists
DROP POLICY IF EXISTS "Startups can update their own applications" ON public.opportunity_applications;

-- Create new policy for startups to update their applications
CREATE POLICY "Startups can update their own applications" 
ON public.opportunity_applications
FOR UPDATE 
TO authenticated
USING (
    startup_id IN (
        SELECT id FROM public.startups 
        WHERE user_id = auth.uid()
    )
)
WITH CHECK (
    startup_id IN (
        SELECT id FROM public.startups 
        WHERE user_id = auth.uid()
    )
);

-- Step 4: Also create a policy for startups to read their own applications
DROP POLICY IF EXISTS "Startups can read their own applications" ON public.opportunity_applications;

CREATE POLICY "Startups can read their own applications" 
ON public.opportunity_applications
FOR SELECT 
TO authenticated
USING (
    startup_id IN (
        SELECT id FROM public.startups 
        WHERE user_id = auth.uid()
    )
);

-- Step 5: Test the policies by checking if the current user can access their applications
SELECT 
    'Current user ID: ' || auth.uid() as current_user,
    'Startup IDs for current user: ' || string_agg(id::text, ', ') as startup_ids
FROM public.startups 
WHERE user_id = auth.uid();

-- Step 6: Test if we can read the specific application
SELECT 
    id,
    startup_id,
    diligence_status,
    diligence_urls,
    'Can read: ' || (startup_id IN (
        SELECT id FROM public.startups 
        WHERE user_id = auth.uid()
    ))::text as can_read
FROM public.opportunity_applications 
WHERE id = 'cef2bf5a-deff-41d4-8b30-f0fcbda1fce2';

-- Step 7: Test update permission (this should work after the policy is created)
-- Note: This is just a test query, don't actually run the update
SELECT 
    'Test update permission for application: cef2bf5a-deff-41d4-8b30-f0fcbda1fce2' as test,
    oa.startup_id,
    string_agg(s.id::text, ', ') as user_startups,
    (oa.startup_id IN (
        SELECT id FROM public.startups 
        WHERE user_id = auth.uid()
    ))::text as can_update
FROM public.opportunity_applications oa
CROSS JOIN public.startups s
WHERE oa.id = 'cef2bf5a-deff-41d4-8b30-f0fcbda1fce2'
AND s.user_id = auth.uid()
GROUP BY oa.startup_id;

-- Step 8: Show final status
SELECT 'RLS policies updated successfully' as status;
