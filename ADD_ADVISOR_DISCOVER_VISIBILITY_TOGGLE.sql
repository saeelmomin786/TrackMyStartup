-- Add toggle to control whether advisor-managed startups appear in All Discover Pitches
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'investment_advisor_profiles'
          AND column_name = 'show_startups_in_all_discover'
    ) THEN
        ALTER TABLE public.investment_advisor_profiles
            ADD COLUMN show_startups_in_all_discover BOOLEAN DEFAULT true;
    END IF;
END $$;

COMMENT ON COLUMN public.investment_advisor_profiles.show_startups_in_all_discover
    IS 'When true, startups under this advisor are visible in All Discover Pitches; when false, only advisor network can see them.';
