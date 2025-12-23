-- CREATE_COMPREHENSIVE_PUBLIC_TABLES.sql
-- Create comprehensive public tables with ALL portfolio/profile details shown on public pages
-- This stores everything needed for public profile pages, not just sitemap data

-- =====================================================
-- 1. CREATE PUBLIC STARTUPS TABLE (Full Portfolio Data)
-- =====================================================

DROP TABLE IF EXISTS public.startups_public_table CASCADE;

CREATE TABLE public.startups_public_table (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    sector TEXT,
    current_valuation NUMERIC,
    currency TEXT,
    compliance_status TEXT,
    -- For sitemap
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_startups_public_table_name ON public.startups_public_table(name);
CREATE INDEX idx_startups_public_table_updated_at ON public.startups_public_table(updated_at);

-- Enable RLS for security
ALTER TABLE public.startups_public_table ENABLE ROW LEVEL SECURITY;

-- ONLY SELECT (read) access - NO INSERT, UPDATE, or DELETE
CREATE POLICY "Public can read startups_public_table" ON public.startups_public_table
    FOR SELECT
    TO anon, authenticated
    USING (true);

-- Grant ONLY SELECT permission (read-only)
GRANT SELECT ON public.startups_public_table TO anon;
-- Explicitly revoke write permissions (if any)
REVOKE INSERT, UPDATE, DELETE ON public.startups_public_table FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.startups_public_table FROM authenticated;

-- =====================================================
-- 2. CREATE PUBLIC FUNDRAISING DETAILS TABLE
-- =====================================================

DROP TABLE IF EXISTS public.fundraising_details_public_table CASCADE;

CREATE TABLE public.fundraising_details_public_table (
    id BIGSERIAL PRIMARY KEY,
    startup_id INTEGER NOT NULL REFERENCES public.startups_public_table(id) ON DELETE CASCADE,
    active BOOLEAN DEFAULT false,
    type TEXT, -- Pre-Seed, Seed, Series A, etc.
    value NUMERIC, -- Investment ask amount
    equity NUMERIC, -- Investment ask equity %
    stage TEXT, -- MVP, Growth, etc.
    pitch_deck_url TEXT,
    pitch_video_url TEXT,
    logo_url TEXT,
    website_url TEXT,
    linkedin_url TEXT,
    business_plan_url TEXT,
    one_pager_url TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_fundraising_public_startup_id ON public.fundraising_details_public_table(startup_id);
CREATE INDEX idx_fundraising_public_active ON public.fundraising_details_public_table(active);

-- Enable RLS for security
ALTER TABLE public.fundraising_details_public_table ENABLE ROW LEVEL SECURITY;

-- ONLY SELECT (read) access - NO INSERT, UPDATE, or DELETE
CREATE POLICY "Public can read fundraising_details_public_table" ON public.fundraising_details_public_table
    FOR SELECT
    TO anon, authenticated
    USING (true);

-- Grant ONLY SELECT permission (read-only)
GRANT SELECT ON public.fundraising_details_public_table TO anon;
-- Explicitly revoke write permissions
REVOKE INSERT, UPDATE, DELETE ON public.fundraising_details_public_table FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.fundraising_details_public_table FROM authenticated;

-- =====================================================
-- 3. CREATE PUBLIC MENTORS TABLE (Full Portfolio Data)
-- =====================================================

DROP TABLE IF EXISTS public.mentors_public_table CASCADE;

CREATE TABLE public.mentors_public_table (
    user_id UUID PRIMARY KEY,
    mentor_name TEXT NOT NULL,
    mentor_type TEXT, -- Industry Expert, Serial Entrepreneur, etc.
    location TEXT,
    website TEXT,
    linkedin_link TEXT,
    email TEXT,
    expertise_areas TEXT[], -- Array of expertise areas
    sectors TEXT[], -- Array of sectors
    mentoring_stages TEXT[], -- Array of stages
    years_of_experience INTEGER,
    companies_mentored INTEGER,
    companies_founded INTEGER,
    current_role TEXT,
    previous_companies TEXT[], -- Array of previous companies
    mentoring_approach TEXT,
    availability TEXT,
    preferred_engagement TEXT,
    fee_type TEXT,
    fee_amount_min NUMERIC,
    fee_amount_max NUMERIC,
    fee_currency TEXT,
    equity_amount_min NUMERIC,
    equity_amount_max NUMERIC,
    fee_description TEXT,
    logo_url TEXT,
    video_url TEXT,
    media_type TEXT CHECK (media_type IN ('logo', 'video')) DEFAULT 'logo',
    -- For sitemap
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_mentors_public_table_name ON public.mentors_public_table(mentor_name);
CREATE INDEX idx_mentors_public_table_updated_at ON public.mentors_public_table(updated_at);

-- Enable RLS for security
ALTER TABLE public.mentors_public_table ENABLE ROW LEVEL SECURITY;

-- ONLY SELECT (read) access - NO INSERT, UPDATE, or DELETE
CREATE POLICY "Public can read mentors_public_table" ON public.mentors_public_table
    FOR SELECT
    TO anon, authenticated
    USING (true);

-- Grant ONLY SELECT permission (read-only)
GRANT SELECT ON public.mentors_public_table TO anon;
-- Explicitly revoke write permissions
REVOKE INSERT, UPDATE, DELETE ON public.mentors_public_table FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.mentors_public_table FROM authenticated;

-- =====================================================
-- 4. INVESTORS TABLE - SKIPPED FOR NOW
-- =====================================================
-- Investors will continue using main table with RLS policies
-- No public table created for investors at this time

-- =====================================================
-- 5. CREATE PUBLIC ADVISORS TABLE (Full Portfolio Data)
-- =====================================================

DROP TABLE IF EXISTS public.advisors_public_table CASCADE;

CREATE TABLE public.advisors_public_table (
    user_id UUID PRIMARY KEY,
    advisor_name TEXT,
    firm_name TEXT,
    display_name TEXT NOT NULL, -- Will be firm_name or advisor_name (for slug)
    global_hq TEXT,
    website TEXT,
    linkedin_link TEXT,
    email TEXT,
    geography TEXT[], -- Array of geographies
    service_types TEXT[], -- Array of service types
    investment_stages TEXT[], -- Array of investment stages
    domain TEXT[], -- Array of domains
    minimum_investment NUMERIC,
    maximum_investment NUMERIC,
    currency TEXT,
    service_description TEXT,
    logo_url TEXT,
    video_url TEXT,
    media_type TEXT CHECK (media_type IN ('logo', 'video')) DEFAULT 'logo',
    -- For sitemap
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_advisors_public_table_name ON public.advisors_public_table(display_name);
CREATE INDEX idx_advisors_public_table_updated_at ON public.advisors_public_table(updated_at);

-- Enable RLS for security
ALTER TABLE public.advisors_public_table ENABLE ROW LEVEL SECURITY;

-- ONLY SELECT (read) access - NO INSERT, UPDATE, or DELETE
CREATE POLICY "Public can read advisors_public_table" ON public.advisors_public_table
    FOR SELECT
    TO anon, authenticated
    USING (true);

-- Grant ONLY SELECT permission (read-only)
GRANT SELECT ON public.advisors_public_table TO anon;
-- Explicitly revoke write permissions
REVOKE INSERT, UPDATE, DELETE ON public.advisors_public_table FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.advisors_public_table FROM authenticated;

-- =====================================================
-- 6. INITIAL DATA SYNC
-- =====================================================

-- Sync existing startups
INSERT INTO public.startups_public_table (id, name, sector, current_valuation, currency, compliance_status, updated_at, created_at)
SELECT id, name, sector, current_valuation, currency, compliance_status, updated_at, created_at
FROM public.startups
WHERE name IS NOT NULL AND name != ''
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    sector = EXCLUDED.sector,
    current_valuation = EXCLUDED.current_valuation,
    currency = EXCLUDED.currency,
    compliance_status = EXCLUDED.compliance_status,
    updated_at = EXCLUDED.updated_at;

-- Sync existing fundraising details
INSERT INTO public.fundraising_details_public_table (
    startup_id, active, type, value, equity, stage,
    pitch_deck_url, pitch_video_url, logo_url, website_url, linkedin_url,
    business_plan_url, one_pager_url, updated_at, created_at
)
SELECT 
    startup_id, active, type, value, equity, stage,
    pitch_deck_url, pitch_video_url, logo_url, website_url, linkedin_url,
    business_plan_url, one_pager_url, updated_at, created_at
FROM public.fundraising_details
WHERE startup_id IN (SELECT id FROM public.startups_public_table)
ON CONFLICT (id) DO UPDATE SET
    active = EXCLUDED.active,
    type = EXCLUDED.type,
    value = EXCLUDED.value,
    equity = EXCLUDED.equity,
    stage = EXCLUDED.stage,
    pitch_deck_url = EXCLUDED.pitch_deck_url,
    pitch_video_url = EXCLUDED.pitch_video_url,
    logo_url = EXCLUDED.logo_url,
    website_url = EXCLUDED.website_url,
    linkedin_url = EXCLUDED.linkedin_url,
    business_plan_url = EXCLUDED.business_plan_url,
    one_pager_url = EXCLUDED.one_pager_url,
    updated_at = EXCLUDED.updated_at;

-- Sync existing mentors (full profile data)
INSERT INTO public.mentors_public_table (
    user_id, mentor_name, mentor_type, location, website, linkedin_link, email,
    expertise_areas, sectors, mentoring_stages, years_of_experience,
    companies_mentored, companies_founded, current_role, previous_companies,
    mentoring_approach, availability, preferred_engagement, fee_type,
    fee_amount_min, fee_amount_max, fee_currency, equity_amount_min, equity_amount_max,
    fee_description, logo_url, video_url, media_type, updated_at, created_at
)
SELECT 
    user_id, mentor_name, mentor_type, location, website, linkedin_link, email,
    expertise_areas, sectors, mentoring_stages, years_of_experience,
    companies_mentored, companies_founded, current_role, previous_companies,
    mentoring_approach, availability, preferred_engagement, fee_type,
    fee_amount_min, fee_amount_max, fee_currency, equity_amount_min, equity_amount_max,
    fee_description, logo_url, video_url, media_type, updated_at, created_at
FROM public.mentor_profiles
WHERE mentor_name IS NOT NULL AND mentor_name != ''
ON CONFLICT (user_id) DO UPDATE SET
    mentor_name = EXCLUDED.mentor_name,
    mentor_type = EXCLUDED.mentor_type,
    location = EXCLUDED.location,
    website = EXCLUDED.website,
    linkedin_link = EXCLUDED.linkedin_link,
    email = EXCLUDED.email,
    expertise_areas = EXCLUDED.expertise_areas,
    sectors = EXCLUDED.sectors,
    mentoring_stages = EXCLUDED.mentoring_stages,
    years_of_experience = EXCLUDED.years_of_experience,
    companies_mentored = EXCLUDED.companies_mentored,
    companies_founded = EXCLUDED.companies_founded,
    current_role = EXCLUDED.current_role,
    previous_companies = EXCLUDED.previous_companies,
    mentoring_approach = EXCLUDED.mentoring_approach,
    availability = EXCLUDED.availability,
    preferred_engagement = EXCLUDED.preferred_engagement,
    fee_type = EXCLUDED.fee_type,
    fee_amount_min = EXCLUDED.fee_amount_min,
    fee_amount_max = EXCLUDED.fee_amount_max,
    fee_currency = EXCLUDED.fee_currency,
    equity_amount_min = EXCLUDED.equity_amount_min,
    equity_amount_max = EXCLUDED.equity_amount_max,
    fee_description = EXCLUDED.fee_description,
    logo_url = EXCLUDED.logo_url,
    video_url = EXCLUDED.video_url,
    media_type = EXCLUDED.media_type,
    updated_at = EXCLUDED.updated_at;

-- Investors sync skipped - using main table with RLS

-- Sync existing advisors (full profile data)
INSERT INTO public.advisors_public_table (
    user_id, advisor_name, firm_name, display_name, global_hq, website, linkedin_link, email,
    geography, service_types, investment_stages, domain,
    minimum_investment, maximum_investment, currency, service_description,
    logo_url, video_url, media_type, updated_at, created_at
)
SELECT 
    user_id, advisor_name, firm_name, 
    COALESCE(firm_name, advisor_name, 'Advisor') as display_name,
    global_hq, website, linkedin_link, email,
    geography, service_types, investment_stages, domain,
    minimum_investment, maximum_investment, currency, service_description,
    logo_url, video_url, media_type, updated_at, created_at
FROM public.investment_advisor_profiles
WHERE (firm_name IS NOT NULL AND firm_name != '') 
   OR (advisor_name IS NOT NULL AND advisor_name != '')
ON CONFLICT (user_id) DO UPDATE SET
    advisor_name = EXCLUDED.advisor_name,
    firm_name = EXCLUDED.firm_name,
    display_name = EXCLUDED.display_name,
    global_hq = EXCLUDED.global_hq,
    website = EXCLUDED.website,
    linkedin_link = EXCLUDED.linkedin_link,
    email = EXCLUDED.email,
    geography = EXCLUDED.geography,
    service_types = EXCLUDED.service_types,
    investment_stages = EXCLUDED.investment_stages,
    domain = EXCLUDED.domain,
    minimum_investment = EXCLUDED.minimum_investment,
    maximum_investment = EXCLUDED.maximum_investment,
    currency = EXCLUDED.currency,
    service_description = EXCLUDED.service_description,
    logo_url = EXCLUDED.logo_url,
    video_url = EXCLUDED.video_url,
    media_type = EXCLUDED.media_type,
    updated_at = EXCLUDED.updated_at;

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================

SELECT '✅ Comprehensive public tables created successfully!' as status;
SELECT '📊 Tables include all portfolio/profile details for public pages' as info;
SELECT '🔄 Next step: Create triggers to auto-sync data' as next_step;

