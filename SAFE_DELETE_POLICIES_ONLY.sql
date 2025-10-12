-- SAFE DELETE POLICIES ONLY
-- Only add DELETE policies for operations that are safe and don't affect startup data

-- 1. ✅ SAFE: Facilitator can delete their own startup relationships (portfolio)
-- This is already working and is safe - it's just removing from facilitator's internal list
-- (No impact on startup data)

-- 2. ✅ SAFE: Facilitator can delete recognition records where they are the facilitator
-- This is safe - recognition records are facilitator's internal records
CREATE POLICY "Facilitators can delete records where they are facilitator" ON public.recognition_records
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.users u 
            WHERE u.facilitator_code = recognition_records.facilitator_code 
            AND u.id = auth.uid()
        )
    );

-- 3. ❌ DANGEROUS: DO NOT add DELETE policies for:
-- - opportunity_applications (would delete startup applications)
-- - incubation_opportunities (would delete entire programs and all applications)

-- 4. Instead, use status-based management:
-- - Set application_status = 'withdrawn' instead of deleting applications
-- - Set opportunity_status = 'closed' instead of deleting opportunities

-- 5. Verify only safe policies exist
SELECT 
    schemaname,
    tablename,
    policyname,
    cmd,
    qual
FROM pg_policies 
WHERE tablename IN ('recognition_records', 'facilitator_startups')
AND cmd = 'DELETE'
ORDER BY tablename, policyname;
