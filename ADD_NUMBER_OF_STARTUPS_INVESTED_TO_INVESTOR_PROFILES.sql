-- Add manual number of startups invested to investor_profiles

ALTER TABLE public.investor_profiles
ADD COLUMN IF NOT EXISTS number_of_startups_invested INTEGER;

COMMENT ON COLUMN public.investor_profiles.number_of_startups_invested IS 'Manual count of startups invested, shown on the investor profile';
