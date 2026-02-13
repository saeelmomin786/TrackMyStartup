-- =====================================================
-- CREATE SUBDOMAIN CONFIGS TABLE
-- =====================================================
-- This table stores white-label branding for each subdomain
-- When users log in from a subdomain, they see that subdomain's logo and name
-- =====================================================

-- Create subdomain_configs table
CREATE TABLE IF NOT EXISTS public.subdomain_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subdomain TEXT UNIQUE NOT NULL, -- e.g., 'xyz', 'advisor1', etc.
    name TEXT NOT NULL, -- e.g., 'XYZ Investment Firm'
    logo_url TEXT, -- URL to the logo image
    domain_url TEXT, -- Optional: full domain if needed
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add comment
COMMENT ON TABLE public.subdomain_configs IS 'Stores white-label branding configuration for each subdomain';

-- Create index on subdomain for fast lookup
CREATE INDEX IF NOT EXISTS idx_subdomain_configs_subdomain ON public.subdomain_configs(subdomain);

-- Enable RLS
ALTER TABLE public.subdomain_configs ENABLE ROW LEVEL SECURITY;

-- Policy: Allow everyone to read subdomain configs (public branding info)
CREATE POLICY "Allow public read access to subdomain configs"
ON public.subdomain_configs
FOR SELECT
TO authenticated
USING (true);

-- Policy: Only admins can insert/update subdomain configs
CREATE POLICY "Allow admins to manage subdomain configs"
ON public.subdomain_configs
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.user_profiles
        WHERE user_profiles.id = auth.uid()
        AND user_profiles.role = 'Admin'
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.user_profiles
        WHERE user_profiles.id = auth.uid()
        AND user_profiles.role = 'Admin'
    )
);

-- Example data (optional - for testing)
-- INSERT INTO public.subdomain_configs (subdomain, name, logo_url) VALUES
-- ('xyz', 'XYZ Investment Firm', 'https://example.com/xyz-logo.png'),
-- ('advisor1', 'Advisor One Company', 'https://example.com/advisor1-logo.png');
