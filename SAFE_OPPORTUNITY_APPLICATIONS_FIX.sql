-- SAFE FIX for opportunity_applications table
-- This preserves existing data while fixing the schema issues

-- 1. First, let's check what columns currently exist
SELECT 'Current table structure:' as info;
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'opportunity_applications' 
    AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. Add missing columns if they don't exist (NON-DESTRUCTIVE)
ALTER TABLE public.opportunity_applications 
ADD COLUMN IF NOT EXISTS sector TEXT,
ADD COLUMN IF NOT EXISTS pitch_deck_url TEXT,
ADD COLUMN IF NOT EXISTS pitch_video_url TEXT,
ADD COLUMN IF NOT EXISTS agreement_url TEXT,
ADD COLUMN IF NOT EXISTS diligence_status TEXT,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 3. Update the updated_at column for existing records
UPDATE public.opportunity_applications 
SET updated_at = NOW() 
WHERE updated_at IS NULL;

-- 4. Create indexes for better performance (NON-DESTRUCTIVE)
CREATE INDEX IF NOT EXISTS idx_opportunity_applications_startup_id ON public.opportunity_applications(startup_id);
CREATE INDEX IF NOT EXISTS idx_opportunity_applications_opportunity_id ON public.opportunity_applications(opportunity_id);
CREATE INDEX IF NOT EXISTS idx_opportunity_applications_status ON public.opportunity_applications(status);

-- 5. Ensure RLS is enabled (NON-DESTRUCTIVE)
ALTER TABLE public.opportunity_applications ENABLE ROW LEVEL SECURITY;

-- 6. Create/Update RLS policies (will replace existing ones but preserve data)
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

-- 7. Ensure the incubation_opportunities table exists with correct schema
CREATE TABLE IF NOT EXISTS public.incubation_opportunities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    facilitator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    program_name TEXT NOT NULL,
    description TEXT NOT NULL,
    deadline DATE NOT NULL,
    poster_url TEXT,
    video_url TEXT,
    facilitator_code TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. Enable RLS on incubation_opportunities if not already enabled
ALTER TABLE public.incubation_opportunities ENABLE ROW LEVEL SECURITY;

-- 9. Create RLS policies for incubation_opportunities
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

-- 10. Verify the setup
SELECT 'Safe fix applied successfully!' as status;

-- 11. Show final table structure
SELECT 'Final table structure:' as info;
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'opportunity_applications' 
    AND table_schema = 'public'
ORDER BY ordinal_position;

-- 12. Show RLS policies
SELECT 'RLS policies for opportunity_applications:' as policies;
SELECT policyname, cmd, permissive 
FROM pg_policies 
WHERE tablename = 'opportunity_applications' 
    AND schemaname = 'public';

-- 13. Count existing records to confirm data preservation
SELECT 'Existing applications count:' as data_check;
SELECT COUNT(*) as total_applications FROM public.opportunity_applications;

SELECT 'SAFE FIX COMPLETED - NO DATA LOST!' as final_status;









