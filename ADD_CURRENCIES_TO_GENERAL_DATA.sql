-- =====================================================
-- ADD CURRENCIES TO GENERAL_DATA TABLE
-- =====================================================
-- This script adds currency entries to the general_data table
-- Currencies will be available in the Investor Profile form and can be managed by admins

-- Insert Currencies
INSERT INTO public.general_data (category, code, name, display_order, is_active) VALUES
('currency', 'USD', 'US Dollar', 1, true),
('currency', 'EUR', 'Euro', 2, true),
('currency', 'GBP', 'British Pound', 3, true),
('currency', 'INR', 'Indian Rupee', 4, true),
('currency', 'CAD', 'Canadian Dollar', 5, true),
('currency', 'AUD', 'Australian Dollar', 6, true),
('currency', 'SGD', 'Singapore Dollar', 7, true),
('currency', 'JPY', 'Japanese Yen', 8, true),
('currency', 'CNY', 'Chinese Yuan', 9, true),
('currency', 'AED', 'UAE Dirham', 10, true),
('currency', 'SAR', 'Saudi Riyal', 11, true),
('currency', 'CHF', 'Swiss Franc', 12, true),
('currency', 'BRL', 'Brazilian Real', 13, true),
('currency', 'MXN', 'Mexican Peso', 14, true),
('currency', 'ZAR', 'South African Rand', 15, true),
('currency', 'NGN', 'Nigerian Naira', 16, true),
('currency', 'KES', 'Kenyan Shilling', 17, true),
('currency', 'EGP', 'Egyptian Pound', 18, true),
('currency', 'ILS', 'Israeli Shekel', 19, true),
('currency', 'JOD', 'Jordanian Dinar', 20, true),
('currency', 'PHP', 'Philippine Peso', 21, true),
('currency', 'RUB', 'Russian Ruble', 22, true),
('currency', 'LKR', 'Sri Lankan Rupee', 23, true),
('currency', 'BTN', 'Bhutanese Ngultrum', 24, true),
('currency', 'AMD', 'Armenian Dram', 25, true),
('currency', 'BYN', 'Belarusian Ruble', 26, true),
('currency', 'GEL', 'Georgian Lari', 27, true)
ON CONFLICT (category, name) DO NOTHING;

-- Verify the insert
SELECT 
    category,
    code,
    name,
    display_order,
    is_active
FROM public.general_data
WHERE category = 'currency'
ORDER BY display_order, name;

-- Add comments
COMMENT ON TABLE public.general_data IS 'Stores all dropdown/select options including currencies, countries, sectors, etc.';
COMMENT ON COLUMN public.general_data.category IS 'Category type: country, sector, mentor_type, round_type, stage, domain, currency';
COMMENT ON COLUMN public.general_data.code IS 'Currency code (e.g., USD, EUR, INR) or country code (e.g., IN, US)';


