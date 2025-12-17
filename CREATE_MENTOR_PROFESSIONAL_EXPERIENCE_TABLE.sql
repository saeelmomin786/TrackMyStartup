-- Create mentor_professional_experience table for storing mentor professional experience
-- This table stores individual professional experience entries for mentors

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

-- Create index on mentor_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_mentor_professional_experience_mentor_id ON public.mentor_professional_experience(mentor_id);

-- Create index on from_date for sorting
CREATE INDEX IF NOT EXISTS idx_mentor_professional_experience_from_date ON public.mentor_professional_experience(from_date DESC);

-- Enable Row Level Security
ALTER TABLE public.mentor_professional_experience ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Mentors can view their own professional experiences
CREATE POLICY "Mentors can view their professional experiences" ON public.mentor_professional_experience
    FOR SELECT USING (mentor_id = auth.uid());

-- Mentors can insert their own professional experiences
CREATE POLICY "Mentors can insert their professional experiences" ON public.mentor_professional_experience
    FOR INSERT WITH CHECK (mentor_id = auth.uid());

-- Mentors can update their own professional experiences
CREATE POLICY "Mentors can update their professional experiences" ON public.mentor_professional_experience
    FOR UPDATE USING (mentor_id = auth.uid());

-- Mentors can delete their own professional experiences
CREATE POLICY "Mentors can delete their professional experiences" ON public.mentor_professional_experience
    FOR DELETE USING (mentor_id = auth.uid());

-- Public can view professional experiences (for mentor profiles)
CREATE POLICY "Public can view professional experiences" ON public.mentor_professional_experience
    FOR SELECT USING (true);







