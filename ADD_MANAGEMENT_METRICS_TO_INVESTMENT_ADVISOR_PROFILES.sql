-- Adds management and verified metrics to investment_advisor_profiles
-- Idempotent: uses IF NOT EXISTS checks per column

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'investment_advisor_profiles' AND column_name = 'startups_under_management'
    ) THEN
        ALTER TABLE public.investment_advisor_profiles ADD COLUMN startups_under_management INTEGER DEFAULT 0;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'investment_advisor_profiles' AND column_name = 'investors_under_management'
    ) THEN
        ALTER TABLE public.investment_advisor_profiles ADD COLUMN investors_under_management INTEGER DEFAULT 0;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'investment_advisor_profiles' AND column_name = 'successful_fundraises_startups'
    ) THEN
        ALTER TABLE public.investment_advisor_profiles ADD COLUMN successful_fundraises_startups INTEGER DEFAULT 0;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'investment_advisor_profiles' AND column_name = 'verified_startups_under_management'
    ) THEN
        ALTER TABLE public.investment_advisor_profiles ADD COLUMN verified_startups_under_management INTEGER DEFAULT 0;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'investment_advisor_profiles' AND column_name = 'verified_investors_under_management'
    ) THEN
        ALTER TABLE public.investment_advisor_profiles ADD COLUMN verified_investors_under_management INTEGER DEFAULT 0;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'investment_advisor_profiles' AND column_name = 'verified_successful_fundraises_startups'
    ) THEN
        ALTER TABLE public.investment_advisor_profiles ADD COLUMN verified_successful_fundraises_startups INTEGER DEFAULT 0;
    END IF;
END $$;



