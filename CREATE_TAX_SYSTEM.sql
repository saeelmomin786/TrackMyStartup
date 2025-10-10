-- Tax System Database Schema
-- This file contains the database setup for tax configuration and calculation

-- =====================================================
-- STEP 1: CREATE TAX CONFIGURATION TABLE
-- =====================================================

-- Create tax_configurations table
CREATE TABLE IF NOT EXISTS tax_configurations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    tax_percentage DECIMAL(5,2) NOT NULL CHECK (tax_percentage >= 0 AND tax_percentage <= 100),
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    applies_to_user_type VARCHAR(50) NOT NULL CHECK (applies_to_user_type IN ('Investor', 'Startup', 'Startup Facilitation Center', 'Investment Advisor')),
    country VARCHAR(100) DEFAULT 'Global',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_tax_configurations_user_type ON tax_configurations(applies_to_user_type);
CREATE INDEX IF NOT EXISTS idx_tax_configurations_active ON tax_configurations(is_active);

-- =====================================================
-- STEP 2: INSERT DEFAULT TAX CONFIGURATIONS
-- =====================================================

-- Insert default tax configurations for different user types
INSERT INTO tax_configurations (name, tax_percentage, description, applies_to_user_type, country, is_active) VALUES
('Startup Tax - Global', 18.00, '18% tax for startup subscriptions globally', 'Startup', 'Global', true),
('Startup Tax - India', 18.00, '18% GST for startup subscriptions in India', 'Startup', 'India', true),
('Startup Tax - USA', 8.25, '8.25% tax for startup subscriptions in USA', 'Startup', 'United States', true),
('Startup Tax - Europe', 20.00, '20% VAT for startup subscriptions in Europe', 'Startup', 'Europe', true)

-- Handle conflicts - update existing configurations if they exist
ON CONFLICT (name, applies_to_user_type, country) 
DO UPDATE SET
    tax_percentage = EXCLUDED.tax_percentage,
    description = EXCLUDED.description,
    is_active = EXCLUDED.is_active,
    updated_at = NOW();

-- =====================================================
-- STEP 3: ADD TAX COLUMNS TO EXISTING TABLES
-- =====================================================

-- Add tax columns to user_subscriptions table
ALTER TABLE user_subscriptions 
ADD COLUMN IF NOT EXISTS tax_percentage DECIMAL(5,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS tax_amount DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS total_amount_with_tax DECIMAL(10,2) DEFAULT 0.00;

-- Add tax columns to payments table
ALTER TABLE payments 
ADD COLUMN IF NOT EXISTS tax_percentage DECIMAL(5,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS tax_amount DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS total_amount_with_tax DECIMAL(10,2) DEFAULT 0.00;

-- =====================================================
-- STEP 4: CREATE TAX CALCULATION FUNCTION
-- =====================================================

-- Function to calculate tax amount
CREATE OR REPLACE FUNCTION calculate_tax_amount(
    base_amount DECIMAL(10,2),
    tax_percentage DECIMAL(5,2)
)
RETURNS DECIMAL(10,2)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN ROUND((base_amount * tax_percentage / 100), 2);
END;
$$;

-- Function to get tax configuration for user type and country
CREATE OR REPLACE FUNCTION get_tax_configuration(
    p_user_type VARCHAR(50),
    p_country VARCHAR(100) DEFAULT 'Global'
)
RETURNS TABLE(
    tax_percentage DECIMAL(5,2),
    tax_name VARCHAR(255)
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        tc.tax_percentage,
        tc.name as tax_name
    FROM tax_configurations tc
    WHERE tc.applies_to_user_type = p_user_type
    AND tc.country = p_country
    AND tc.is_active = true
    ORDER BY tc.created_at DESC
    LIMIT 1;
END;
$$;

-- =====================================================
-- STEP 5: CREATE RLS POLICIES
-- =====================================================

-- Enable RLS on tax_configurations table
ALTER TABLE tax_configurations ENABLE ROW LEVEL SECURITY;

-- Policy for admins to manage tax configurations
CREATE POLICY "tax_configurations_admin_manage" ON tax_configurations
FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM user_profiles 
        WHERE user_id = auth.uid() 
        AND role = 'Admin'
    )
);

-- Policy for users to read tax configurations
CREATE POLICY "tax_configurations_read" ON tax_configurations
FOR SELECT TO authenticated
USING (is_active = true);

-- =====================================================
-- STEP 6: CREATE TRIGGERS FOR UPDATED_AT
-- =====================================================

-- Create trigger for tax_configurations updated_at
CREATE TRIGGER trg_tax_configurations_updated_at
BEFORE UPDATE ON tax_configurations
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

-- =====================================================
-- STEP 7: CREATE VIEWS FOR TAX REPORTING
-- =====================================================

-- View for tax summary by user type
CREATE OR REPLACE VIEW tax_summary_by_user_type AS
SELECT 
    applies_to_user_type,
    country,
    COUNT(*) as configuration_count,
    AVG(tax_percentage) as average_tax_percentage,
    MAX(tax_percentage) as max_tax_percentage,
    MIN(tax_percentage) as min_tax_percentage
FROM tax_configurations
WHERE is_active = true
GROUP BY applies_to_user_type, country;

-- View for subscription tax details
CREATE OR REPLACE VIEW subscription_tax_details AS
SELECT 
    us.id as subscription_id,
    us.user_id,
    us.amount as base_amount,
    us.tax_percentage,
    us.tax_amount,
    us.total_amount_with_tax,
    sp.name as plan_name,
    sp.currency,
    up.role as user_role,
    up.country as user_country
FROM user_subscriptions us
JOIN subscription_plans sp ON us.plan_id = sp.id
JOIN user_profiles up ON us.user_id = up.user_id
WHERE us.tax_amount > 0;

-- =====================================================
-- STEP 8: INSERT SAMPLE DATA FOR TESTING
-- =====================================================

-- Insert sample tax configurations for testing
INSERT INTO tax_configurations (name, tax_percentage, description, applies_to_user_type, country, is_active) VALUES
('Test Tax - Startup', 15.00, '15% test tax for startup subscriptions', 'Startup', 'Test Country', true),
('Test Tax - Investor', 10.00, '10% test tax for investor subscriptions', 'Investor', 'Test Country', true)
ON CONFLICT (name, applies_to_user_type, country) DO NOTHING;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Verify tax configurations are created
SELECT 'Tax configurations created successfully' as status, COUNT(*) as count FROM tax_configurations;

-- Verify tax calculation function works
SELECT 'Tax calculation test' as test, calculate_tax_amount(100.00, 18.00) as tax_amount, 118.00 as expected_total;

-- Verify tax configuration retrieval works
SELECT 'Tax config retrieval test' as test, * FROM get_tax_configuration('Startup', 'Global');
