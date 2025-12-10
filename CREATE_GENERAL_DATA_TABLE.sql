-- =====================================================
-- GENERAL DATA MANAGEMENT TABLE
-- =====================================================
-- This table stores all dropdown/select options that can be managed by admins
-- Categories: countries, sectors, mentor_types, round_types, stages, domains

CREATE TABLE IF NOT EXISTS public.general_data (
    id SERIAL PRIMARY KEY,
    category VARCHAR(50) NOT NULL, -- 'country', 'sector', 'mentor_type', 'round_type', 'stage', 'domain'
    code VARCHAR(100), -- Optional code/abbreviation (e.g., 'IN' for India, 'US' for United States)
    name VARCHAR(255) NOT NULL, -- Display name
    description TEXT, -- Optional description
    display_order INTEGER DEFAULT 0, -- Order for display in dropdowns
    is_active BOOLEAN DEFAULT true, -- Whether this item is active/available
    metadata JSONB, -- Additional metadata if needed
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by VARCHAR(255), -- User who created this record
    updated_by VARCHAR(255), -- User who last updated this record
    
    -- Ensure unique combination of category and name
    UNIQUE(category, name)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_general_data_category ON public.general_data(category);
CREATE INDEX IF NOT EXISTS idx_general_data_category_active ON public.general_data(category, is_active);
CREATE INDEX IF NOT EXISTS idx_general_data_display_order ON public.general_data(category, display_order);

-- Enable Row Level Security
ALTER TABLE public.general_data ENABLE ROW LEVEL SECURITY;

-- Policy: Allow all authenticated users to read active items
CREATE POLICY "Allow read access to active general data" 
    ON public.general_data
    FOR SELECT
    USING (is_active = true);

-- Policy: Allow admins to read all items (including inactive)
CREATE POLICY "Allow admins to read all general data" 
    ON public.general_data
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id::text = auth.uid()::text 
            AND users.role = 'Admin'
        )
    );

-- Policy: Allow admins to insert
CREATE POLICY "Allow admins to insert general data" 
    ON public.general_data
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id::text = auth.uid()::text 
            AND users.role = 'Admin'
        )
    );

-- Policy: Allow admins to update
CREATE POLICY "Allow admins to update general data" 
    ON public.general_data
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id::text = auth.uid()::text 
            AND users.role = 'Admin'
        )
    );

-- Policy: Allow admins to delete (soft delete by setting is_active = false)
CREATE POLICY "Allow admins to delete general data" 
    ON public.general_data
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id::text = auth.uid()::text 
            AND users.role = 'Admin'
        )
    );

-- Add comments
COMMENT ON TABLE public.general_data IS 'Centralized table for managing dropdown/select options (countries, sectors, mentor types, etc.)';
COMMENT ON COLUMN public.general_data.category IS 'Type of data: country, sector, mentor_type, round_type, stage, domain';
COMMENT ON COLUMN public.general_data.code IS 'Optional code/abbreviation for the item';
COMMENT ON COLUMN public.general_data.name IS 'Display name shown in dropdowns';
COMMENT ON COLUMN public.general_data.display_order IS 'Order for displaying items in dropdowns (lower numbers first)';
COMMENT ON COLUMN public.general_data.is_active IS 'Whether this item is active and should be shown in dropdowns';

-- =====================================================
-- INSERT INITIAL DATA
-- =====================================================

-- Insert Countries
INSERT INTO public.general_data (category, code, name, display_order, is_active) VALUES
('country', 'IN', 'India', 1, true),
('country', 'US', 'United States', 2, true),
('country', 'UK', 'United Kingdom', 3, true),
('country', 'SG', 'Singapore', 4, true),
('country', 'AE', 'UAE', 5, true),
('country', 'DE', 'Germany', 6, true),
('country', 'FR', 'France', 7, true),
('country', 'CA', 'Canada', 8, true),
('country', 'AU', 'Australia', 9, true),
('country', 'JP', 'Japan', 10, true),
('country', 'CN', 'China', 11, true),
('country', 'BR', 'Brazil', 12, true)
ON CONFLICT (category, name) DO NOTHING;

-- Insert Sectors
INSERT INTO public.general_data (category, name, display_order, is_active) VALUES
('sector', 'SaaS', 1, true),
('sector', 'E-commerce', 2, true),
('sector', 'FinTech', 3, true),
('sector', 'HealthTech', 4, true),
('sector', 'EdTech', 5, true),
('sector', 'AgriTech', 6, true),
('sector', 'AI/ML', 7, true),
('sector', 'Blockchain', 8, true),
('sector', 'Gaming', 9, true),
('sector', 'Media', 10, true),
('sector', 'Real Estate', 11, true),
('sector', 'Manufacturing', 12, true),
('sector', 'Other', 99, true)
ON CONFLICT (category, name) DO NOTHING;

-- Insert Mentor Types
INSERT INTO public.general_data (category, name, display_order, is_active) VALUES
('mentor_type', 'Industry Expert', 1, true),
('mentor_type', 'Serial Entrepreneur', 2, true),
('mentor_type', 'Corporate Executive', 3, true),
('mentor_type', 'Academic', 4, true),
('mentor_type', 'Investor', 5, true),
('mentor_type', 'Other', 99, true)
ON CONFLICT (category, name) DO NOTHING;

-- Insert Round Types (Investment Types)
INSERT INTO public.general_data (category, name, display_order, is_active) VALUES
('round_type', 'Pre-Seed', 1, true),
('round_type', 'Seed', 2, true),
('round_type', 'Series A', 3, true),
('round_type', 'Series B', 4, true),
('round_type', 'Series C', 5, true),
('round_type', 'Series D+', 6, true),
('round_type', 'Bridge', 7, true),
('round_type', 'Growth', 8, true)
ON CONFLICT (category, name) DO NOTHING;

-- Insert Stages (Startup Stages)
INSERT INTO public.general_data (category, name, display_order, is_active) VALUES
('stage', 'Ideation', 1, true),
('stage', 'Proof of Concept', 2, true),
('stage', 'MVP', 3, true),
('stage', 'Product Market Fit', 4, true),
('stage', 'Scaling', 5, true)
ON CONFLICT (category, name) DO NOTHING;

-- Insert Domains (Startup Domains)
INSERT INTO public.general_data (category, name, display_order, is_active) VALUES
('domain', 'Agriculture', 1, true),
('domain', 'AI', 2, true),
('domain', 'Climate', 3, true),
('domain', 'Consumer Goods', 4, true),
('domain', 'Defence', 5, true),
('domain', 'E-commerce', 6, true),
('domain', 'Education', 7, true),
('domain', 'EV', 8, true),
('domain', 'Finance', 9, true),
('domain', 'Food & Beverage', 10, true),
('domain', 'Healthcare', 11, true),
('domain', 'Manufacturing', 12, true),
('domain', 'Media & Entertainment', 13, true),
('domain', 'Others', 14, true),
('domain', 'PaaS', 15, true),
('domain', 'Renewable Energy', 16, true),
('domain', 'Retail', 17, true),
('domain', 'SaaS', 18, true),
('domain', 'Social Impact', 19, true),
('domain', 'Space', 20, true),
('domain', 'Transportation and Logistics', 21, true),
('domain', 'Waste Management', 22, true),
('domain', 'Web 3.0', 23, true)
ON CONFLICT (category, name) DO NOTHING;

-- Create a function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_general_data_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_general_data_updated_at
    BEFORE UPDATE ON public.general_data
    FOR EACH ROW
    EXECUTE FUNCTION update_general_data_updated_at();

-- Create a view for easy querying by category
CREATE OR REPLACE VIEW public.general_data_by_category AS
SELECT 
    category,
    code,
    name,
    description,
    display_order,
    is_active,
    metadata,
    created_at,
    updated_at
FROM public.general_data
WHERE is_active = true
ORDER BY category, display_order, name;

COMMENT ON VIEW public.general_data_by_category IS 'View showing only active general data items, ordered by category and display order';




