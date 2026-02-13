-- =====================================================
-- ADD SUBDOMAIN CONFIGURATION - HELPER SCRIPT
-- =====================================================
-- Use this script to quickly add new subdomain configurations
-- Replace the values below with your actual subdomain data
-- =====================================================

-- Example 1: Add a subdomain with logo
INSERT INTO public.subdomain_configs (subdomain, name, logo_url)
VALUES (
    'xyz',                                    -- Subdomain (e.g., xyz.trackmystartup.com)
    'XYZ Investment Firm',                    -- Display name
    'https://example.com/logos/xyz-logo.png'  -- Logo URL
)
ON CONFLICT (subdomain) DO UPDATE 
SET 
    name = EXCLUDED.name,
    logo_url = EXCLUDED.logo_url,
    updated_at = NOW();

-- Example 2: Add another subdomain
INSERT INTO public.subdomain_configs (subdomain, name, logo_url)
VALUES (
    'advisor1',
    'Advisor One Company',
    'https://example.com/logos/advisor1-logo.png'
)
ON CONFLICT (subdomain) DO UPDATE 
SET 
    name = EXCLUDED.name,
    logo_url = EXCLUDED.logo_url,
    updated_at = NOW();

-- =====================================================
-- VIEW ALL SUBDOMAIN CONFIGS
-- =====================================================
SELECT 
    subdomain,
    name,
    logo_url,
    created_at,
    updated_at
FROM public.subdomain_configs
ORDER BY created_at DESC;

-- =====================================================
-- UPDATE EXISTING SUBDOMAIN CONFIG
-- =====================================================
-- Update logo for a specific subdomain
UPDATE public.subdomain_configs
SET 
    logo_url = 'https://new-logo-url.com/logo.png',
    updated_at = NOW()
WHERE subdomain = 'xyz';

-- Update name for a specific subdomain
UPDATE public.subdomain_configs
SET 
    name = 'New Company Name',
    updated_at = NOW()
WHERE subdomain = 'xyz';

-- =====================================================
-- DELETE SUBDOMAIN CONFIG
-- =====================================================
-- Remove a subdomain configuration
DELETE FROM public.subdomain_configs
WHERE subdomain = 'xyz';

-- =====================================================
-- SEARCH FOR SUBDOMAIN
-- =====================================================
-- Check if a subdomain exists
SELECT * FROM public.subdomain_configs
WHERE subdomain = 'xyz';
