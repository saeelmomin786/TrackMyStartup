-- INSERT_COUNTRIES_TO_GENERAL_DATA.sql
-- This script inserts countries into the general_data table with category 'country'

INSERT INTO public.general_data (category, name, display_order, is_active) VALUES
('country', 'Armenia', 15, true),
('country', 'Austria', 16, true),
('country', 'Bahrain', 17, true),
('country', 'Belgium', 18, true),
('country', 'Bermuda', 19, true),
('country', 'Brazil', 20, true),
('country', 'Bulgaria', 21, true),
('country', 'Cayman Islands', 22, true),
('country', 'Chile', 23, true),
('country', 'Colombia', 24, true),
('country', 'Costa Rica', 25, true),
('country', 'Cyprus', 26, true),
('country', 'Denmark', 27, true),
('country', 'Egypt', 28, true),
('country', 'Estonia', 29, true),
('country', 'Europe', 30, true),
('country', 'Finland', 31, true),
('country', 'Georgia', 32, true),
('country', 'Greece', 33, true),
('country', 'Hong Kong', 34, true),
('country', 'Hungary', 35, true),
('country', 'Indonesia', 36, true),
('country', 'Ireland', 37, true),
('country', 'Israel', 38, true),
('country', 'Italy', 39, true),
('country', 'Jersey', 40, true),
('country', 'Jordan', 41, true),
('country', 'Kenya', 42, true),
('country', 'Lebanon', 43, true),
('country', 'Lithuania', 44, true),
('country', 'Luxembourg', 45, true),
('country', 'Mali', 46, true),
('country', 'Malta', 47, true),
('country', 'Mauritius', 48, true),
('country', 'Mexico', 49, true),
('country', 'Netherlands', 50, true),
('country', 'New Zealand', 51, true),
('country', 'Niger', 52, true),
('country', 'Philippines', 53, true),
('country', 'Poland', 54, true),
('country', 'Portugal', 55, true),
('country', 'Remote', 56, true),
('country', 'Russian Federation', 57, true),
('country', 'Saudi Arabia', 58, true),
('country', 'Slovakia', 59, true),
('country', 'Spain', 60, true),
('country', 'Sweden', 61, true),
('country', 'Switzerland', 62, true),
('country', 'Thailand', 63, true),
('country', 'United Arab Emirates', 64, true)
ON CONFLICT (category, name) DO NOTHING;

-- Verify the insert
SELECT 
    category,
    name,
    display_order,
    is_active
FROM public.general_data
WHERE category = 'country'
ORDER BY display_order, name;

