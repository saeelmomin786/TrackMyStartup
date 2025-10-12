-- Fix all missing DELETE policies for facilitation dashboard
-- This script adds the missing DELETE policies for all tables used in delete operations

-- 1. Add DELETE policy for facilitators on recognition_records
-- (Currently only startups can delete, but facilitators need to delete too)
CREATE POLICY "Facilitators can delete records where they are facilitator" ON public.recognition_records
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.users u 
            WHERE u.facilitator_code = recognition_records.facilitator_code 
            AND u.id = auth.uid()
        )
    );

-- 2. Add DELETE policy for facilitators on opportunity_applications
-- (Currently no DELETE policy exists)
CREATE POLICY "Facilitators can delete applications to their opportunities" ON public.opportunity_applications
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.incubation_opportunities o
            WHERE o.id = opportunity_id AND o.facilitator_id = auth.uid()
        )
    );

-- 3. Add DELETE policy for facilitators on incubation_opportunities
-- (Currently no DELETE policy exists)
CREATE POLICY "Facilitators can delete their own opportunities" ON public.incubation_opportunities
    FOR DELETE USING (auth.uid() = facilitator_id);

-- 4. Verify all policies were created
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
WHERE tablename IN ('recognition_records', 'opportunity_applications', 'incubation_opportunities', 'facilitator_startups')
AND cmd = 'DELETE'
ORDER BY tablename, policyname;
