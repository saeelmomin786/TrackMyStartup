-- ENHANCE_EXISTING_VIEWS_AND_ADD_TABLES.sql
-- Enhance existing views and add tables only for mentors and advisors
-- This works with your existing setup

-- =====================================================
-- 1. ENHANCE EXISTING STARTUPS_PUBLIC VIEW
-- =====================================================

-- Add updated_at to existing view (needed for sitemap)
-- SAFE: This only recreates the view, doesn't modify the main table
-- The view is just a SELECT query - it reads from startups table
DROP VIEW IF EXISTS public.startups_public;

CREATE VIEW public.startups_public AS
SELECT 
    id,
    name,
    sector,
    current_valuation,
    currency,
    compliance_status,
    updated_at  -- Added for sitemap lastmod (column exists in startups table)
FROM public.startups;

GRANT SELECT ON public.startups_public TO anon;

-- VERIFY: This view is read-only and doesn't affect the main startups table
-- All existing queries using startups_public will continue to work
-- Only difference: updated_at column is now available

-- =====================================================
-- 2. ENHANCE EXISTING FUNDRAISING_DETAILS_PUBLIC VIEW
-- =====================================================

-- Add updated_at and missing URL columns to existing view
-- SAFE: This only recreates the view, doesn't modify the main table
-- The view is just a SELECT query - it reads from fundraising_details table
DROP VIEW IF EXISTS public.fundraising_details_public;

CREATE VIEW public.fundraising_details_public AS
SELECT 
    id,
    startup_id,
    active,
    type,
    value,
    equity,
    stage,
    pitch_deck_url,
    pitch_video_url,
    logo_url,
    website_url,
    linkedin_url,
    business_plan_url,
    one_pager_url,
    created_at,
    updated_at  -- Added for sitemap lastmod (if exists in main table)
FROM public.fundraising_details;

GRANT SELECT ON public.fundraising_details_public TO anon;

-- VERIFY: This view is read-only and doesn't affect the main fundraising_details table
-- All existing queries using fundraising_details_public will continue to work
-- Only difference: More columns are now available (URLs and updated_at)

-- =====================================================
-- 3. CREATE PUBLIC TABLE FOR MENTORS (No view exists)
-- =====================================================

DROP TABLE IF EXISTS public.mentors_public_table CASCADE;

CREATE TABLE public.mentors_public_table (
    user_id UUID PRIMARY KEY,
    mentor_name TEXT NOT NULL,
    mentor_type TEXT,
    location TEXT,
    website TEXT,
    linkedin_link TEXT,
    email TEXT,
    expertise_areas TEXT[],
    sectors TEXT[],
    mentoring_stages TEXT[],
    years_of_experience INTEGER,
    companies_mentored INTEGER,
    companies_founded INTEGER,
    "current_role" TEXT,
    previous_companies TEXT[],
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
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_mentors_public_table_name ON public.mentors_public_table(mentor_name);
CREATE INDEX idx_mentors_public_table_updated_at ON public.mentors_public_table(updated_at);

ALTER TABLE public.mentors_public_table ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read mentors_public_table" ON public.mentors_public_table
    FOR SELECT
    TO anon, authenticated
    USING (true);

GRANT SELECT ON public.mentors_public_table TO anon;
REVOKE INSERT, UPDATE, DELETE ON public.mentors_public_table FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.mentors_public_table FROM authenticated;

-- =====================================================
-- 4. CREATE PUBLIC TABLE FOR ADVISORS (No view exists)
-- =====================================================

DROP TABLE IF EXISTS public.advisors_public_table CASCADE;

CREATE TABLE public.advisors_public_table (
    user_id UUID PRIMARY KEY,
    advisor_name TEXT,
    firm_name TEXT,
    display_name TEXT NOT NULL,
    global_hq TEXT,
    website TEXT,
    linkedin_link TEXT,
    email TEXT,
    geography TEXT[],
    service_types TEXT[],
    investment_stages TEXT[],
    domain TEXT[],
    minimum_investment NUMERIC,
    maximum_investment NUMERIC,
    currency TEXT,
    service_description TEXT,
    logo_url TEXT,
    video_url TEXT,
    media_type TEXT CHECK (media_type IN ('logo', 'video')) DEFAULT 'logo',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_advisors_public_table_name ON public.advisors_public_table(display_name);
CREATE INDEX idx_advisors_public_table_updated_at ON public.advisors_public_table(updated_at);

ALTER TABLE public.advisors_public_table ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read advisors_public_table" ON public.advisors_public_table
    FOR SELECT
    TO anon, authenticated
    USING (true);

GRANT SELECT ON public.advisors_public_table TO anon;
REVOKE INSERT, UPDATE, DELETE ON public.advisors_public_table FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.advisors_public_table FROM authenticated;

-- =====================================================
-- 5. INITIAL DATA SYNC FOR MENTORS AND ADVISORS
-- =====================================================

-- Sync existing mentors
INSERT INTO public.mentors_public_table (
    user_id, mentor_name, mentor_type, location, website, linkedin_link, email,
    expertise_areas, sectors, mentoring_stages, years_of_experience,
    companies_mentored, companies_founded, "current_role", previous_companies,
    mentoring_approach, availability, preferred_engagement, fee_type,
    fee_amount_min, fee_amount_max, fee_currency, equity_amount_min, equity_amount_max,
    fee_description, logo_url, video_url, media_type, updated_at, created_at
)
SELECT 
    user_id, mentor_name, mentor_type, location, website, linkedin_link, email,
    expertise_areas, sectors, mentoring_stages, years_of_experience,
    companies_mentored, companies_founded, "current_role", previous_companies,
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
    "current_role" = EXCLUDED."current_role",
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

-- Sync existing advisors
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

SELECT '✅ Enhanced existing views and created mentor/advisor tables!' as status;
SELECT '📊 Views: startups_public, fundraising_details_public (enhanced with updated_at)' as info;
SELECT '📊 Tables: mentors_public_table, advisors_public_table (new)' as info;
SELECT '🔄 Next step: Create triggers for mentors and advisors only' as next_step;

