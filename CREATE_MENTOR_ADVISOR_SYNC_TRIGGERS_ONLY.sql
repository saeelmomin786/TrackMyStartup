-- CREATE_MENTOR_ADVISOR_SYNC_TRIGGERS_ONLY.sql
-- Create triggers ONLY for mentors and advisors (startups use views)

-- =====================================================
-- 1. SYNC FUNCTION FOR MENTORS
-- =====================================================

CREATE OR REPLACE FUNCTION sync_mentor_to_public_table()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.mentors_public_table (
        user_id, mentor_name, mentor_type, location, website, linkedin_link, email,
        expertise_areas, sectors, mentoring_stages, years_of_experience,
        companies_mentored, companies_founded, "current_role", previous_companies,
        mentoring_approach, availability, preferred_engagement, fee_type,
        fee_amount_min, fee_amount_max, fee_currency, equity_amount_min, equity_amount_max,
        fee_description, logo_url, video_url, media_type, updated_at, created_at
    )
    VALUES (
        NEW.user_id, NEW.mentor_name, NEW.mentor_type, NEW.location, NEW.website, 
        NEW.linkedin_link, NEW.email, NEW.expertise_areas, NEW.sectors, NEW.mentoring_stages,
        NEW.years_of_experience, NEW.companies_mentored, NEW.companies_founded, NEW."current_role",
        NEW.previous_companies, NEW.mentoring_approach, NEW.availability, NEW.preferred_engagement,
        NEW.fee_type, NEW.fee_amount_min, NEW.fee_amount_max, NEW.fee_currency,
        NEW.equity_amount_min, NEW.equity_amount_max, NEW.fee_description,
        NEW.logo_url, NEW.video_url, NEW.media_type, NEW.updated_at, NEW.created_at
    )
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
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_sync_mentor_to_public ON public.mentor_profiles;
CREATE TRIGGER trigger_sync_mentor_to_public
    AFTER INSERT OR UPDATE ON public.mentor_profiles
    FOR EACH ROW
    WHEN (NEW.mentor_name IS NOT NULL AND NEW.mentor_name != '')
    EXECUTE FUNCTION sync_mentor_to_public_table();

CREATE OR REPLACE FUNCTION delete_mentor_from_public_table()
RETURNS TRIGGER AS $$
BEGIN
    DELETE FROM public.mentors_public_table WHERE user_id = OLD.user_id;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_delete_mentor_from_public ON public.mentor_profiles;
CREATE TRIGGER trigger_delete_mentor_from_public
    AFTER DELETE ON public.mentor_profiles
    FOR EACH ROW
    EXECUTE FUNCTION delete_mentor_from_public_table();

-- =====================================================
-- 2. SYNC FUNCTION FOR ADVISORS
-- =====================================================

CREATE OR REPLACE FUNCTION sync_advisor_to_public_table()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.advisors_public_table (
        user_id, advisor_name, firm_name, display_name, global_hq, website, linkedin_link, email,
        geography, service_types, investment_stages, domain,
        minimum_investment, maximum_investment, currency, service_description,
        logo_url, video_url, media_type, updated_at, created_at
    )
    VALUES (
        NEW.user_id, NEW.advisor_name, NEW.firm_name,
        COALESCE(NEW.firm_name, NEW.advisor_name, 'Advisor'),
        NEW.global_hq, NEW.website, NEW.linkedin_link, NEW.email,
        NEW.geography, NEW.service_types, NEW.investment_stages, NEW.domain,
        NEW.minimum_investment, NEW.maximum_investment, NEW.currency, NEW.service_description,
        NEW.logo_url, NEW.video_url, NEW.media_type, NEW.updated_at, NEW.created_at
    )
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
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_sync_advisor_to_public ON public.investment_advisor_profiles;
CREATE TRIGGER trigger_sync_advisor_to_public
    AFTER INSERT OR UPDATE ON public.investment_advisor_profiles
    FOR EACH ROW
    WHEN ((NEW.firm_name IS NOT NULL AND NEW.firm_name != '') 
       OR (NEW.advisor_name IS NOT NULL AND NEW.advisor_name != ''))
    EXECUTE FUNCTION sync_advisor_to_public_table();

CREATE OR REPLACE FUNCTION delete_advisor_from_public_table()
RETURNS TRIGGER AS $$
BEGIN
    DELETE FROM public.advisors_public_table WHERE user_id = OLD.user_id;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_delete_advisor_from_public ON public.investment_advisor_profiles;
CREATE TRIGGER trigger_delete_advisor_from_public
    AFTER DELETE ON public.investment_advisor_profiles
    FOR EACH ROW
    EXECUTE FUNCTION delete_advisor_from_public_table();

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================

SELECT '✅ Sync triggers created for mentors and advisors!' as status;
SELECT '📊 Startups: Using existing views (no triggers needed)' as info;
SELECT '📊 Mentors: Using public table with auto-sync triggers' as info;
SELECT '📊 Advisors: Using public table with auto-sync triggers' as info;
SELECT '📊 Investors: Using main table with RLS (no public table)' as info;

