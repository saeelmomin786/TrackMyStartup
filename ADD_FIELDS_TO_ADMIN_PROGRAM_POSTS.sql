-- Add grant_amount, country, domain, stage, and rounds fields to admin_program_posts table
-- Note: country, domain, stage, and rounds support multiple selection (stored as JSONB arrays)

ALTER TABLE public.admin_program_posts
ADD COLUMN IF NOT EXISTS grant_amount NUMERIC(15, 2) NULL,
ADD COLUMN IF NOT EXISTS country JSONB NULL,
ADD COLUMN IF NOT EXISTS domain JSONB NULL,
ADD COLUMN IF NOT EXISTS stage JSONB NULL,
ADD COLUMN IF NOT EXISTS rounds JSONB NULL;

-- Add comments for documentation
COMMENT ON COLUMN public.admin_program_posts.grant_amount IS 'Grant amount for the program (optional)';
COMMENT ON COLUMN public.admin_program_posts.country IS 'Array of country names from general_data table (category: country) stored as JSON array - supports multiple selection';
COMMENT ON COLUMN public.admin_program_posts.domain IS 'Array of domain names from general_data table (category: domain) stored as JSON array - supports multiple selection';
COMMENT ON COLUMN public.admin_program_posts.stage IS 'Array of stage names from general_data table (category: stage) stored as JSON array - supports multiple selection';
COMMENT ON COLUMN public.admin_program_posts.rounds IS 'Array of round types from general_data table (category: round_type) stored as JSON array - supports multiple selection';

