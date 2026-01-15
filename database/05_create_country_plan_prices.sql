-- =====================================================
-- CREATE COUNTRY PLAN PRICES TABLE
-- =====================================================
-- Admin sets prices in INR for each country
-- All payments will be processed in INR

CREATE TABLE IF NOT EXISTS country_plan_prices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    country VARCHAR(100) NOT NULL,
    plan_tier VARCHAR(20) NOT NULL CHECK (plan_tier IN ('free', 'basic', 'premium')),
    price_inr DECIMAL(10,2) NOT NULL, -- Price in Indian Rupees
    payment_gateway VARCHAR(20) NOT NULL CHECK (payment_gateway IN ('razorpay', 'payaid')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(country, plan_tier)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_country_plan_prices_country ON country_plan_prices(country);
CREATE INDEX IF NOT EXISTS idx_country_plan_prices_tier ON country_plan_prices(plan_tier);
CREATE INDEX IF NOT EXISTS idx_country_plan_prices_active ON country_plan_prices(is_active) WHERE is_active = true;

-- =====================================================
-- INSERT DEFAULT PRICES (Example data)
-- =====================================================

-- India prices
INSERT INTO country_plan_prices (country, plan_tier, price_inr, payment_gateway, is_active) VALUES
('India', 'free', 0.00, 'razorpay', true),
('India', 'basic', 2000.00, 'razorpay', true),
('India', 'premium', 8000.00, 'razorpay', true)
ON CONFLICT (country, plan_tier) 
DO UPDATE SET
    price_inr = EXCLUDED.price_inr,
    payment_gateway = EXCLUDED.payment_gateway,
    is_active = EXCLUDED.is_active,
    updated_at = NOW();

-- United States prices
INSERT INTO country_plan_prices (country, plan_tier, price_inr, payment_gateway, is_active) VALUES
('United States', 'free', 0.00, 'payaid', true),
('United States', 'basic', 2500.00, 'payaid', true),
('United States', 'premium', 10000.00, 'payaid', true)
ON CONFLICT (country, plan_tier) 
DO UPDATE SET
    price_inr = EXCLUDED.price_inr,
    payment_gateway = EXCLUDED.payment_gateway,
    is_active = EXCLUDED.is_active,
    updated_at = NOW();

-- United Kingdom prices
INSERT INTO country_plan_prices (country, plan_tier, price_inr, payment_gateway, is_active) VALUES
('United Kingdom', 'free', 0.00, 'payaid', true),
('United Kingdom', 'basic', 2200.00, 'payaid', true),
('United Kingdom', 'premium', 8800.00, 'payaid', true)
ON CONFLICT (country, plan_tier) 
DO UPDATE SET
    price_inr = EXCLUDED.price_inr,
    payment_gateway = EXCLUDED.payment_gateway,
    is_active = EXCLUDED.is_active,
    updated_at = NOW();

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================

GRANT SELECT ON country_plan_prices TO authenticated;
GRANT SELECT ON country_plan_prices TO anon;

-- =====================================================
-- VERIFY DATA
-- =====================================================

SELECT 
    country,
    plan_tier,
    price_inr,
    payment_gateway,
    is_active
FROM country_plan_prices
ORDER BY country, 
    CASE plan_tier 
        WHEN 'free' THEN 1 
        WHEN 'basic' THEN 2 
        WHEN 'premium' THEN 3 
    END;
