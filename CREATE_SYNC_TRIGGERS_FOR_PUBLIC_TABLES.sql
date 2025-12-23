-- CREATE_SYNC_TRIGGERS_FOR_PUBLIC_TABLES.sql
-- Create triggers to automatically sync data from main tables to public tables
-- This ensures public tables stay up-to-date when main tables are updated

-- =====================================================
-- 1. SYNC FUNCTION FOR STARTUPS
-- =====================================================

CREATE OR REPLACE FUNCTION sync_startup_to_public_table()
RETURNS TRIGGER AS $$
BEGIN
    -- Insert or update in public table
    INSERT INTO public.startups_public_table (id, name, sector, updated_at, created_at)
    VALUES (NEW.id, NEW.name, NEW.sector, NEW.updated_at, NEW.created_at)
    ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        sector = EXCLUDED.sector,
        updated_at = EXCLUDED.updated_at;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for INSERT and UPDATE
DROP TRIGGER IF EXISTS trigger_sync_startup_to_public ON public.startups;
CREATE TRIGGER trigger_sync_startup_to_public
    AFTER INSERT OR UPDATE ON public.startups
    FOR EACH ROW
    WHEN (NEW.name IS NOT NULL AND NEW.name != '')
    EXECUTE FUNCTION sync_startup_to_public_table();

-- Create trigger for DELETE
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
-- 2. SYNC FUNCTION FOR MENTORS
-- =====================================================

CREATE OR REPLACE FUNCTION sync_mentor_to_public_table()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.mentors_public_table (user_id, mentor_name, updated_at, created_at)
    VALUES (NEW.user_id, NEW.mentor_name, NEW.updated_at, NEW.created_at)
    ON CONFLICT (user_id) DO UPDATE SET
        mentor_name = EXCLUDED.mentor_name,
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
-- 3. SYNC FUNCTION FOR INVESTORS
-- =====================================================

CREATE OR REPLACE FUNCTION sync_investor_to_public_table()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.investors_public_table (user_id, investor_name, updated_at, created_at)
    VALUES (NEW.user_id, NEW.investor_name, NEW.updated_at, NEW.created_at)
    ON CONFLICT (user_id) DO UPDATE SET
        investor_name = EXCLUDED.investor_name,
        updated_at = EXCLUDED.updated_at;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_sync_investor_to_public ON public.investor_profiles;
CREATE TRIGGER trigger_sync_investor_to_public
    AFTER INSERT OR UPDATE ON public.investor_profiles
    FOR EACH ROW
    WHEN (NEW.investor_name IS NOT NULL AND NEW.investor_name != '')
    EXECUTE FUNCTION sync_investor_to_public_table();

CREATE OR REPLACE FUNCTION delete_investor_from_public_table()
RETURNS TRIGGER AS $$
BEGIN
    DELETE FROM public.investors_public_table WHERE user_id = OLD.user_id;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_delete_investor_from_public ON public.investor_profiles;
CREATE TRIGGER trigger_delete_investor_from_public
    AFTER DELETE ON public.investor_profiles
    FOR EACH ROW
    EXECUTE FUNCTION delete_investor_from_public_table();

-- =====================================================
-- 4. SYNC FUNCTION FOR ADVISORS
-- =====================================================

CREATE OR REPLACE FUNCTION sync_advisor_to_public_table()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.advisors_public_table (user_id, firm_name, advisor_name, display_name, updated_at, created_at)
    VALUES (
        NEW.user_id, 
        NEW.firm_name, 
        NEW.advisor_name,
        COALESCE(NEW.firm_name, NEW.advisor_name, 'Advisor'),
        NEW.updated_at, 
        NEW.created_at
    )
    ON CONFLICT (user_id) DO UPDATE SET
        firm_name = EXCLUDED.firm_name,
        advisor_name = EXCLUDED.advisor_name,
        display_name = EXCLUDED.display_name,
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

SELECT '✅ Sync triggers created successfully!' as status;
SELECT '🔄 Public tables will now auto-update when main tables change' as info;


