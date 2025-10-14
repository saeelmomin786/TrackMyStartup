-- Fix RLS policies to allow public access to incubation_opportunities
-- Run this in Supabase SQL editor

-- 1. Drop existing restrictive policies
DROP POLICY IF EXISTS "Anyone can view opportunities" ON public.incubation_opportunities;
DROP POLICY IF EXISTS opps_select_all ON public.incubation_opportunities;

-- 2. Create new policy that allows public (unauthenticated) access to view opportunities
CREATE POLICY "Public can view opportunities" ON public.incubation_opportunities
    FOR SELECT 
    TO public
    USING (true);

-- 3. Keep the facilitator management policy for authenticated users
DROP POLICY IF EXISTS "Facilitators can manage their opportunities" ON public.incubation_opportunities;
CREATE POLICY "Facilitators can manage their opportunities" ON public.incubation_opportunities
    FOR ALL TO authenticated
    USING (auth.uid() = facilitator_id);

-- 4. Also allow authenticated users to view opportunities (for logged-in users)
CREATE POLICY "Authenticated users can view opportunities" ON public.incubation_opportunities
    FOR SELECT 
    TO authenticated
    USING (true);

-- 5. Verify the table structure has all needed columns
ALTER TABLE public.incubation_opportunities 
ADD COLUMN IF NOT EXISTS opportunity_status TEXT DEFAULT 'active',
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 6. Create index for better performance on public queries
CREATE INDEX IF NOT EXISTS idx_incubation_opportunities_public 
ON public.incubation_opportunities(opportunity_status, created_at DESC);

-- 7. Test query to verify public access works
-- This should work without authentication:
-- SELECT id, program_name, description, deadline, poster_url, video_url 
-- FROM public.incubation_opportunities 
-- WHERE opportunity_status = 'active' 
-- ORDER BY created_at DESC;
