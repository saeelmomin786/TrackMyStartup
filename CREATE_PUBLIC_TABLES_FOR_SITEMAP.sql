-- CREATE_PUBLIC_TABLES_FOR_SITEMAP.sql
-- Create separate public tables for each role that contain ONLY public information
-- This provides better security and easier sitemap generation

-- =====================================================
-- 1. CREATE PUBLIC STARTUPS TABLE
-- =====================================================

-- Drop table if exists
DROP TABLE IF EXISTS public.startups_public_table CASCADE;

-- Create public startups table with only public fields
CREATE TABLE public.startups_public_table (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    sector TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX idx_startups_public_table_name ON public.startups_public_table(name);
CREATE INDEX idx_startups_public_table_updated_at ON public.startups_public_table(updated_at);

-- Grant public read access (no RLS needed - this is a public table)
ALTER TABLE public.startups_public_table ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read
CREATE POLICY "Public can read startups_public_table" ON public.startups_public_table
    FOR SELECT
    TO anon, authenticated
    USING (true);

-- Grant SELECT to anon role
GRANT SELECT ON public.startups_public_table TO anon;

-- =====================================================
-- 2. CREATE PUBLIC MENTORS TABLE
-- =====================================================

-- Drop table if exists
DROP TABLE IF EXISTS public.mentors_public_table CASCADE;

-- Create public mentors table
CREATE TABLE public.mentors_public_table (
    user_id UUID PRIMARY KEY,
    mentor_name TEXT NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index
CREATE INDEX idx_mentors_public_table_name ON public.mentors_public_table(mentor_name);
CREATE INDEX idx_mentors_public_table_updated_at ON public.mentors_public_table(updated_at);

-- Grant public read access
ALTER TABLE public.mentors_public_table ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read mentors_public_table" ON public.mentors_public_table
    FOR SELECT
    TO anon, authenticated
    USING (true);

GRANT SELECT ON public.mentors_public_table TO anon;

-- =====================================================
-- 3. CREATE PUBLIC INVESTORS TABLE
-- =====================================================

-- Drop table if exists
DROP TABLE IF EXISTS public.investors_public_table CASCADE;

-- Create public investors table
CREATE TABLE public.investors_public_table (
    user_id UUID PRIMARY KEY,
    investor_name TEXT NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index
CREATE INDEX idx_investors_public_table_name ON public.investors_public_table(investor_name);
CREATE INDEX idx_investors_public_table_updated_at ON public.investors_public_table(updated_at);

-- Grant public read access
ALTER TABLE public.investors_public_table ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read investors_public_table" ON public.investors_public_table
    FOR SELECT
    TO anon, authenticated
    USING (true);

GRANT SELECT ON public.investors_public_table TO anon;

-- =====================================================
-- 4. CREATE PUBLIC ADVISORS TABLE
-- =====================================================

-- Drop table if exists
DROP TABLE IF EXISTS public.advisors_public_table CASCADE;

-- Create public advisors table
CREATE TABLE public.advisors_public_table (
    user_id UUID PRIMARY KEY,
    firm_name TEXT,
    advisor_name TEXT,
    display_name TEXT NOT NULL, -- Will be firm_name or advisor_name
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index
CREATE INDEX idx_advisors_public_table_name ON public.advisors_public_table(display_name);
CREATE INDEX idx_advisors_public_table_updated_at ON public.advisors_public_table(updated_at);

-- Grant public read access
ALTER TABLE public.advisors_public_table ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read advisors_public_table" ON public.advisors_public_table
    FOR SELECT
    TO anon, authenticated
    USING (true);

GRANT SELECT ON public.advisors_public_table TO anon;

-- =====================================================
-- 5. INITIAL DATA SYNC
-- =====================================================

-- Sync existing startups
INSERT INTO public.startups_public_table (id, name, sector, updated_at, created_at)
SELECT id, name, sector, updated_at, created_at
FROM public.startups
WHERE name IS NOT NULL AND name != ''
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    sector = EXCLUDED.sector,
    updated_at = EXCLUDED.updated_at;

-- Sync existing mentors
INSERT INTO public.mentors_public_table (user_id, mentor_name, updated_at, created_at)
SELECT user_id, mentor_name, updated_at, created_at
FROM public.mentor_profiles
WHERE mentor_name IS NOT NULL AND mentor_name != ''
ON CONFLICT (user_id) DO UPDATE SET
    mentor_name = EXCLUDED.mentor_name,
    updated_at = EXCLUDED.updated_at;

-- Sync existing investors
INSERT INTO public.investors_public_table (user_id, investor_name, updated_at, created_at)
SELECT user_id, investor_name, updated_at, created_at
FROM public.investor_profiles
WHERE investor_name IS NOT NULL AND investor_name != ''
ON CONFLICT (user_id) DO UPDATE SET
    investor_name = EXCLUDED.investor_name,
    updated_at = EXCLUDED.updated_at;

-- Sync existing advisors
INSERT INTO public.advisors_public_table (user_id, firm_name, advisor_name, display_name, updated_at, created_at)
SELECT 
    user_id,
    firm_name,
    advisor_name,
    COALESCE(firm_name, advisor_name, 'Advisor') as display_name,
    updated_at,
    created_at
FROM public.investment_advisor_profiles
WHERE (firm_name IS NOT NULL AND firm_name != '') 
   OR (advisor_name IS NOT NULL AND advisor_name != '')
ON CONFLICT (user_id) DO UPDATE SET
    firm_name = EXCLUDED.firm_name,
    advisor_name = EXCLUDED.advisor_name,
    display_name = EXCLUDED.display_name,
    updated_at = EXCLUDED.updated_at;

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================

SELECT '✅ Public tables created successfully!' as status;
SELECT '📊 Next step: Create triggers to auto-sync data' as next_step;


