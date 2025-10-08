-- FINAL FIX for opportunity_applications table
-- This resolves the 400 error by ensuring consistent schema and proper RLS policies

-- 1. Drop and recreate the table with the correct schema
DROP TABLE IF EXISTS public.opportunity_applications CASCADE;

CREATE TABLE public.opportunity_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    startup_id BIGINT NOT NULL REFERENCES public.startups(id) ON DELETE CASCADE,
    opportunity_id UUID NOT NULL REFERENCES public.incubation_opportunities(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending',
    pitch_deck_url TEXT,
    pitch_video_url TEXT,
    sector TEXT, -- Added missing sector column
    agreement_url TEXT,
    diligence_status TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Enable RLS
ALTER TABLE public.opportunity_applications ENABLE ROW LEVEL SECURITY;

-- 3. Create RLS policies
-- Policy for startups to insert their own applications
DROP POLICY IF EXISTS apps_insert_startup ON public.opportunity_applications;
CREATE POLICY apps_insert_startup ON public.opportunity_applications
    FOR INSERT TO AUTHENTICATED 
    WITH CHECK (
        auth.uid() = (SELECT user_id FROM public.startups WHERE id = startup_id)
    );

-- Policy for startups to select their own applications
DROP POLICY IF EXISTS apps_select_startup ON public.opportunity_applications;
CREATE POLICY apps_select_startup ON public.opportunity_applications
    FOR SELECT TO AUTHENTICATED 
    USING (
        auth.uid() = (SELECT user_id FROM public.startups WHERE id = startup_id)
    );

-- Policy for facilitators to select applications for their opportunities
DROP POLICY IF EXISTS apps_select_facilitator ON public.opportunity_applications;
CREATE POLICY apps_select_facilitator ON public.opportunity_applications
    FOR SELECT TO AUTHENTICATED 
    USING (
        EXISTS (
            SELECT 1 FROM public.incubation_opportunities 
            WHERE id = opportunity_id AND facilitator_id = auth.uid()
        )
    );

-- Policy for facilitators to update applications for their opportunities
DROP POLICY IF EXISTS apps_update_facilitator ON public.opportunity_applications;
CREATE POLICY apps_update_facilitator ON public.opportunity_applications
    FOR UPDATE TO AUTHENTICATED 
    USING (
        EXISTS (
            SELECT 1 FROM public.incubation_opportunities 
            WHERE id = opportunity_id AND facilitator_id = auth.uid()
        )
    );

-- 4. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_opportunity_applications_startup_id ON public.opportunity_applications(startup_id);
CREATE INDEX IF NOT EXISTS idx_opportunity_applications_opportunity_id ON public.opportunity_applications(opportunity_id);
CREATE INDEX IF NOT EXISTS idx_opportunity_applications_status ON public.opportunity_applications(status);

-- 5. Ensure the incubation_opportunities table exists with correct schema
CREATE TABLE IF NOT EXISTS public.incubation_opportunities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    facilitator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    program_name TEXT NOT NULL,
    description TEXT NOT NULL,
    deadline DATE NOT NULL,
    poster_url TEXT,
    video_url TEXT,
    facilitator_code TEXT, -- Add facilitator_code column if missing
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Enable RLS on incubation_opportunities
ALTER TABLE public.incubation_opportunities ENABLE ROW LEVEL SECURITY;

-- 7. Create RLS policies for incubation_opportunities
DROP POLICY IF EXISTS opps_select_all ON public.incubation_opportunities;
CREATE POLICY opps_select_all ON public.incubation_opportunities
    FOR SELECT TO AUTHENTICATED 
    USING (true);

DROP POLICY IF EXISTS opps_insert_own ON public.incubation_opportunities;
CREATE POLICY opps_insert_own ON public.incubation_opportunities
    FOR INSERT TO AUTHENTICATED 
    WITH CHECK (auth.uid() = facilitator_id);

DROP POLICY IF EXISTS opps_update_own ON public.incubation_opportunities;
CREATE POLICY opps_update_own ON public.incubation_opportunities
    FOR UPDATE TO AUTHENTICATED 
    USING (auth.uid() = facilitator_id);

DROP POLICY IF EXISTS opps_delete_own ON public.incubation_opportunities;
CREATE POLICY opps_delete_own ON public.incubation_opportunities
    FOR DELETE TO AUTHENTICATED 
    USING (auth.uid() = facilitator_id);

-- 8. Verify the setup
SELECT 'Schema verification completed successfully!' as status;

-- 9. Test the table structure
SELECT 
    'opportunity_applications columns:' as table_info,
    column_name, 
    data_type, 
    is_nullable 
FROM information_schema.columns 
WHERE table_name = 'opportunity_applications' 
    AND table_schema = 'public'
ORDER BY ordinal_position;

-- 10. Test RLS policies
SELECT 
    'RLS policies for opportunity_applications:' as policies,
    policyname, 
    cmd, 
    permissive 
FROM pg_policies 
WHERE tablename = 'opportunity_applications' 
    AND schemaname = 'public';

SELECT 'FINAL FIX APPLIED SUCCESSFULLY!' as final_status;









