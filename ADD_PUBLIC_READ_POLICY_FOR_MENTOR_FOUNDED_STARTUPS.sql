-- =====================================================
-- ADD PUBLIC READ POLICY FOR MENTOR FOUNDED STARTUPS
-- =====================================================
-- This allows public pages to read mentor_founded_startups
-- for calculating startup experience years
-- =====================================================

-- Add public read policy for mentor_founded_startups
-- This allows anonymous users to read founded startup data for public mentor profiles
DROP POLICY IF EXISTS "Public can read mentor founded startups" ON public.mentor_founded_startups;

CREATE POLICY "Public can read mentor founded startups" 
ON public.mentor_founded_startups
FOR SELECT 
TO anon, authenticated
USING (true);

-- Grant SELECT permission to anonymous users
GRANT SELECT ON public.mentor_founded_startups TO anon;

-- =====================================================
-- ENSURE PROFESSIONAL EXPERIENCE ALSO HAS GRANT PERMISSIONS
-- =====================================================
-- mentor_professional_experience already has a public read policy,
-- but we need to ensure GRANT permissions are set
GRANT SELECT ON public.mentor_professional_experience TO anon;

-- =====================================================
-- VERIFY THE POLICY WAS CREATED
-- =====================================================
SELECT 
    policyname,
    cmd,
    permissive,
    roles,
    qual
FROM pg_policies 
WHERE tablename = 'mentor_founded_startups'
ORDER BY policyname;

