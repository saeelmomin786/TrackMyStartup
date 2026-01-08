-- ADD_ROUND_TYPES_TO_GENERAL_DATA.sql
-- This script adds Round Type values to the general_data table

-- Insert round types if they don't exist
INSERT INTO public.general_data (category, name, display_order, is_active) VALUES
('round_type', 'Pre-Seed', 1, true),
('round_type', 'Seed', 2, true),
('round_type', 'Series A', 3, true),
('round_type', 'Series B', 4, true),
('round_type', 'Series C', 5, true),
('round_type', 'Series D', 6, true)
ON CONFLICT (category, name) DO NOTHING;

-- Verify the round types were added
SELECT 
    id,
    category,
    name,
    display_order,
    is_active,
    created_at
FROM public.general_data
WHERE category = 'round_type'
ORDER BY display_order, name;

-- Show count
SELECT 
    COUNT(*) as total_round_types,
    COUNT(*) FILTER (WHERE is_active = true) as active_round_types
FROM public.general_data
WHERE category = 'round_type';




