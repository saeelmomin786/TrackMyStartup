-- =====================================================
-- CREATE MENTOR PROFESSIONAL EXPERIENCE TABLE
-- =====================================================
-- This table stores individual professional experience entries for mentors
-- =====================================================

-- =====================================================
-- STEP 1: CREATE TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.mentor_professional_experience (
    id BIGSERIAL PRIMARY KEY,
    mentor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    company TEXT NOT NULL,
    position TEXT NOT NULL,
    description TEXT,
    from_date DATE NOT NULL,
    to_date DATE,
    currently_working BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- STEP 2: CREATE INDEXES
-- =====================================================

-- Index on mentor_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_mentor_professional_experience_mentor_id 
ON public.mentor_professional_experience(mentor_id);

-- Index on from_date for sorting
CREATE INDEX IF NOT EXISTS idx_mentor_professional_experience_from_date 
ON public.mentor_professional_experience(from_date DESC);

-- =====================================================
-- STEP 3: ENABLE ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE public.mentor_professional_experience ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- STEP 4: CREATE/UPDATE RLS POLICIES
-- =====================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Mentors can view their professional experiences" ON public.mentor_professional_experience;
DROP POLICY IF EXISTS "Mentors can insert their professional experiences" ON public.mentor_professional_experience;
DROP POLICY IF EXISTS "Mentors can update their professional experiences" ON public.mentor_professional_experience;
DROP POLICY IF EXISTS "Mentors can delete their professional experiences" ON public.mentor_professional_experience;
DROP POLICY IF EXISTS "Public can view professional experiences" ON public.mentor_professional_experience;
DROP POLICY IF EXISTS "Admins can view all professional experiences" ON public.mentor_professional_experience;

-- Mentors can view their own professional experiences
CREATE POLICY "Mentors can view their professional experiences" 
ON public.mentor_professional_experience
FOR SELECT 
USING (mentor_id = auth.uid());

-- Mentors can insert their own professional experiences
CREATE POLICY "Mentors can insert their professional experiences" 
ON public.mentor_professional_experience
FOR INSERT 
WITH CHECK (mentor_id = auth.uid());

-- Mentors can update their own professional experiences
CREATE POLICY "Mentors can update their professional experiences" 
ON public.mentor_professional_experience
FOR UPDATE 
USING (mentor_id = auth.uid())
WITH CHECK (mentor_id = auth.uid());

-- Mentors can delete their own professional experiences
CREATE POLICY "Mentors can delete their professional experiences" 
ON public.mentor_professional_experience
FOR DELETE 
USING (mentor_id = auth.uid());

-- Public can view professional experiences (for mentor profiles)
CREATE POLICY "Public can view professional experiences" 
ON public.mentor_professional_experience
FOR SELECT 
USING (true);

-- Admins can view all professional experiences
CREATE POLICY "Admins can view all professional experiences" 
ON public.mentor_professional_experience
FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = auth.uid() 
        AND role = 'Admin'
    )
);

-- =====================================================
-- STEP 5: CREATE TRIGGER FOR UPDATED_AT
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_mentor_professional_experience_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists
DROP TRIGGER IF EXISTS mentor_professional_experience_updated_at 
ON public.mentor_professional_experience;

-- Create trigger
CREATE TRIGGER mentor_professional_experience_updated_at
    BEFORE UPDATE ON public.mentor_professional_experience
    FOR EACH ROW
    EXECUTE FUNCTION update_mentor_professional_experience_updated_at();

-- =====================================================
-- STEP 6: VERIFY TABLE STRUCTURE
-- =====================================================

SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'mentor_professional_experience'
ORDER BY ordinal_position;

-- =====================================================
-- STEP 7: VERIFY POLICIES
-- =====================================================

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
WHERE tablename = 'mentor_professional_experience'
ORDER BY policyname;

-- =====================================================
-- NOTES:
-- =====================================================
-- 1. The table uses mentor_id which references auth.users(id)
-- 2. All RLS policies use auth.uid() to ensure mentors can only
--    modify their own professional experiences
-- 3. Public can view experiences for discovery purposes
-- 4. The updated_at field is automatically updated via trigger
-- 5. If currently_working is true, to_date should be null
-- =====================================================
