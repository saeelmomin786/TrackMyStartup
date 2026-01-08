-- =====================================================
-- QUESTION CATEGORIES TABLE
-- =====================================================
-- This script creates a table to store predefined question categories
-- Run this in your Supabase SQL Editor
-- =====================================================

-- Create question categories table
CREATE TABLE IF NOT EXISTS public.question_categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_question_categories_active ON public.question_categories(is_active, display_order);

-- Enable Row Level Security
ALTER TABLE public.question_categories ENABLE ROW LEVEL SECURITY;

-- Policy: Allow all authenticated users to read active categories
CREATE POLICY "Allow read access to active question categories" 
    ON public.question_categories
    FOR SELECT
    USING (is_active = true);

-- Policy: Allow admins to read all categories (including inactive)
CREATE POLICY "Allow admins to read all question categories" 
    ON public.question_categories
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE user_profiles.auth_user_id = auth.uid()
            AND user_profiles.role = 'Admin'::user_role
        )
    );

-- Policy: Allow admins to insert categories
CREATE POLICY "Allow admins to insert question categories" 
    ON public.question_categories
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE user_profiles.auth_user_id = auth.uid()
            AND user_profiles.role = 'Admin'::user_role
        )
    );

-- Policy: Allow admins to update categories
CREATE POLICY "Allow admins to update question categories" 
    ON public.question_categories
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE user_profiles.auth_user_id = auth.uid()
            AND user_profiles.role = 'Admin'::user_role
        )
    );

-- Policy: Allow admins to delete categories
CREATE POLICY "Allow admins to delete question categories" 
    ON public.question_categories
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE user_profiles.auth_user_id = auth.uid()
            AND user_profiles.role = 'Admin'::user_role
        )
    );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_question_categories_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
DROP TRIGGER IF EXISTS trigger_update_question_categories_updated_at ON public.question_categories;
CREATE TRIGGER trigger_update_question_categories_updated_at
    BEFORE UPDATE ON public.question_categories
    FOR EACH ROW
    EXECUTE FUNCTION update_question_categories_updated_at();

-- Insert predefined categories
INSERT INTO public.question_categories (name, display_order, is_active) VALUES
    ('Company Info', 1, true),
    ('Financial', 2, true),
    ('Team', 3, true),
    ('Product', 4, true),
    ('Market', 5, true),
    ('Technology', 6, true),
    ('Social Impact', 7, true),
    ('Environmental', 8, true),
    ('Legal', 9, true),
    ('Operations', 10, true),
    ('Marketing', 11, true),
    ('Sales', 12, true),
    ('Customer', 13, true),
    ('Competition', 14, true),
    ('Growth', 15, true),
    ('Funding', 16, true),
    ('Partnerships', 17, true),
    ('Other', 18, true)
ON CONFLICT (name) DO NOTHING;

COMMENT ON TABLE public.question_categories IS 'Stores predefined categories for application questions';
COMMENT ON COLUMN public.question_categories.name IS 'Category name (e.g., Company Info, Financial, Team)';
COMMENT ON COLUMN public.question_categories.display_order IS 'Order for display in dropdowns';
COMMENT ON COLUMN public.question_categories.is_active IS 'Whether this category is active and available for use';

