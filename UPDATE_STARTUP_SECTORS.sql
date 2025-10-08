-- =====================================================
-- UPDATE STARTUP SECTORS FOR PORTFOLIO DISTRIBUTION CHART
-- =====================================================
-- This script updates startup sectors to have more diverse data for the portfolio distribution chart

-- Update existing startups with different sectors
UPDATE public.startups 
SET sector = 'Healthcare' 
WHERE id = 1 AND name LIKE '%Tech%';

UPDATE public.startups 
SET sector = 'Fintech' 
WHERE id = 2;

UPDATE public.startups 
SET sector = 'E-commerce' 
WHERE id = 3;

UPDATE public.startups 
SET sector = 'Education' 
WHERE id = 4;

UPDATE public.startups 
SET sector = 'Manufacturing' 
WHERE id = 5;

-- If we don't have enough startups, let's add some sample ones with different sectors
INSERT INTO public.startups (
    name, 
    investment_type, 
    investment_value, 
    equity_allocation, 
    current_valuation, 
    compliance_status, 
    sector, 
    total_funding, 
    total_revenue, 
    registration_date, 
    user_id
) VALUES 
    ('HealthTech Solutions', 'Seed', 300000, 8.0, 3750000, 'Compliant', 'Healthcare', 300000, 120000, '2023-03-15', (SELECT id FROM auth.users LIMIT 1)),
    ('PayFlow Systems', 'Series A', 2000000, 15.0, 13333333, 'Compliant', 'Fintech', 2000000, 800000, '2023-02-20', (SELECT id FROM auth.users LIMIT 1)),
    ('EduLearn Platform', 'Pre-Seed', 150000, 5.0, 3000000, 'Pending', 'Education', 150000, 45000, '2023-04-10', (SELECT id FROM auth.users LIMIT 1)),
    ('GreenManufacturing Co', 'Seed', 800000, 12.0, 6666667, 'Compliant', 'Manufacturing', 800000, 320000, '2023-01-25', (SELECT id FROM auth.users LIMIT 1)),
    ('ShopSmart App', 'Series A', 1500000, 18.0, 8333333, 'Compliant', 'E-commerce', 1500000, 600000, '2023-05-05', (SELECT id FROM auth.users LIMIT 1))
ON CONFLICT DO NOTHING;

-- Verify the updates
SELECT id, name, sector, compliance_status 
FROM public.startups 
ORDER BY id;

