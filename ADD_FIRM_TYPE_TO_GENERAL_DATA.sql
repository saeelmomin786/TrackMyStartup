-- =====================================================
-- ADD FIRM TYPE CATEGORY TO GENERAL DATA
-- =====================================================
-- This script adds firm_type category to general_data table
-- for managing investor firm types dynamically

-- Insert Firm Types
INSERT INTO public.general_data (category, name, display_order, is_active) VALUES
('firm_type', 'VC', 1, true),
('firm_type', 'Angel Investor', 2, true),
('firm_type', 'Corporate VC', 3, true),
('firm_type', 'Family Office', 4, true),
('firm_type', 'PE Firm', 5, true),
('firm_type', 'Government', 6, true),
('firm_type', 'Other', 99, true)
ON CONFLICT (category, name) DO NOTHING;



