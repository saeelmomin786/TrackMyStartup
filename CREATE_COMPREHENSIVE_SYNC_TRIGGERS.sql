-- CREATE_COMPREHENSIVE_SYNC_TRIGGERS.sql
-- Create triggers to automatically sync ALL portfolio data from main tables to public tables

-- =====================================================
-- 1. SYNC FUNCTION FOR STARTUPS (Full Data)
-- =====================================================

CREATE OR REPLACE FUNCTION sync_startup_to_public_table()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.startups_public_table (
        id, name, sector, current_valuation, currency, compliance_status, updated_at, created_at
    )
    VALUES (
        NEW.id, NEW.name, NEW.sector, NEW.current_valuation, NEW.currency, 
        NEW.compliance_status, NEW.updated_at, NEW.created_at
    )
    ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        sector = EXCLUDED.sector,
        current_valuation = EXCLUDED.current_valuation,
        currency = EXCLUDED.currency,
        compliance_status = EXCLUDED.compliance_status,
        updated_at = EXCLUDED.updated_at;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_sync_startup_to_public ON public.startups;
CREATE TRIGGER trigger_sync_startup_to_public
    AFTER INSERT OR UPDATE ON public.startups
    FOR EACH ROW
    WHEN (NEW.name IS NOT NULL AND NEW.name != '')
    EXECUTE FUNCTION sync_startup_to_public_table();

CREATE OR REPLACE FUNCTION delete_startup_from_public_table()
RETURNS TRIGGER AS $$
BEGIN
    DELETE FROM public.startups_public_table WHERE id = OLD.id;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_delete_startup_from_public ON public.startups;
CREATE TRIGGER trigger_delete_startup_from_public
    AFTER DELETE ON public.startups
    FOR EACH ROW
    EXECUTE FUNCTION delete_startup_from_public_table();

-- =====================================================
-- 2. SYNC FUNCTION FOR FUNDRAISING DETAILS
-- =====================================================

CREATE OR REPLACE FUNCTION sync_fundraising_to_public_table()
RETURNS TRIGGER AS $$
BEGIN
    -- Only sync if startup exists in public table
    IF EXISTS (SELECT 1 FROM public.startups_public_table WHERE id = NEW.startup_id) THEN
        INSERT INTO public.fundraising_details_public_table (
            startup_id, active, type, value, equity, stage,
            pitch_deck_url, pitch_video_url, logo_url, website_url, linkedin_url,
            business_plan_url, one_pager_url, updated_at, created_at
        )
        VALUES (
            NEW.startup_id, NEW.active, NEW.type, NEW.value, NEW.equity, NEW.stage,
            NEW.pitch_deck_url, NEW.pitch_video_url, NEW.logo_url, NEW.website_url, NEW.linkedin_url,
            NEW.business_plan_url, NEW.one_pager_url, NEW.updated_at, NEW.created_at
        )
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
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_sync_fundraising_to_public ON public.fundraising_details;
CREATE TRIGGER trigger_sync_fundraising_to_public
    AFTER INSERT OR UPDATE ON public.fundraising_details
    FOR EACH ROW
    EXECUTE FUNCTION sync_fundraising_to_public_table();

CREATE OR REPLACE FUNCTION delete_fundraising_from_public_table()
RETURNS TRIGGER AS $$
BEGIN
    DELETE FROM public.fundraising_details_public_table WHERE id = OLD.id;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_delete_fundraising_from_public ON public.fundraising_details;
CREATE TRIGGER trigger_delete_fundraising_from_public
    AFTER DELETE ON public.fundraising_details
    FOR EACH ROW
    EXECUTE FUNCTION delete_fundraising_from_public_table();

-- =====================================================
-- 3. SYNC FUNCTION FOR MENTORS (Full Portfolio Data)
-- =====================================================

CREATE OR REPLACE FUNCTION sync_mentor_to_public_table()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.mentors_public_table (
        user_id, mentor_name, mentor_type, location, website, linkedin_link, email,
        expertise_areas, sectors, mentoring_stages, years_of_experience,
        companies_mentored, companies_founded, current_role, previous_companies,
        mentoring_approach, availability, preferred_engagement, fee_type,
        fee_amount_min, fee_amount_max, fee_currency, equity_amount_min, equity_amount_max,
        fee_description, logo_url, video_url, media_type, updated_at, created_at
    )
    VALUES (
        NEW.user_id, NEW.mentor_name, NEW.mentor_type, NEW.location, NEW.website, 
        NEW.linkedin_link, NEW.email, NEW.expertise_areas, NEW.sectors, NEW.mentoring_stages,
        NEW.years_of_experience, NEW.companies_mentored, NEW.companies_founded, NEW.current_role,
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
-- 4. INVESTORS SYNC - SKIPPED FOR NOW
-- =====================================================
-- Investors will continue using main table with RLS policies
-- No sync triggers created for investors at this time

-- =====================================================
-- 5. SYNC FUNCTION FOR ADVISORS (Full Portfolio Data)
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

SELECT '✅ Comprehensive sync triggers created successfully!' as status;
SELECT '🔄 All portfolio data will auto-sync to public tables' as info;

