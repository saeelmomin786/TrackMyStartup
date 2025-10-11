-- Add company types for United States in compliance_rules_comprehensive table
-- This will fix the "No company types found for country: United States" issue

-- First, let's check what's currently in the table for US
SELECT 'Current US data in compliance_rules_comprehensive:' as info;
SELECT country_code, country_name, company_type, COUNT(*) as rule_count
FROM compliance_rules_comprehensive 
WHERE country_code = 'US' OR country_name = 'United States'
GROUP BY country_code, country_name, company_type;

-- Add comprehensive compliance rules for United States company types
INSERT INTO compliance_rules_comprehensive (
    country_code, 
    country_name, 
    company_type, 
    compliance_name, 
    compliance_description, 
    frequency, 
    verification_required,
    ca_type,
    cs_type
) VALUES
-- C-Corporation rules
('US', 'United States', 'C-Corporation', 'Articles of Incorporation', 'File Articles of Incorporation with state', 'first-year', 'CA', 'CPA', NULL),
('US', 'United States', 'C-Corporation', 'Corporate Bylaws', 'Adopt corporate bylaws', 'first-year', 'CS', NULL, 'Company Secretary'),
('US', 'United States', 'C-Corporation', 'Initial Board Meeting', 'Hold initial board meeting', 'first-year', 'both', 'CPA', 'Company Secretary'),
('US', 'United States', 'C-Corporation', 'Annual Report', 'File annual report with state', 'annual', 'CA', 'CPA', NULL),
('US', 'United States', 'C-Corporation', 'Board Meeting Minutes', 'Maintain board meeting minutes', 'quarterly', 'CS', NULL, 'Company Secretary'),
('US', 'United States', 'C-Corporation', 'Tax Returns', 'File corporate tax returns', 'annual', 'CA', 'CPA', NULL),

-- S-Corporation rules
('US', 'United States', 'S-Corporation', 'Articles of Incorporation', 'File Articles of Incorporation with state', 'first-year', 'CA', 'CPA', NULL),
('US', 'United States', 'S-Corporation', 'S-Corp Election', 'File S-Corporation election with IRS', 'first-year', 'CA', 'CPA', NULL),
('US', 'United States', 'S-Corporation', 'Corporate Bylaws', 'Adopt corporate bylaws', 'first-year', 'CS', NULL, 'Company Secretary'),
('US', 'United States', 'S-Corporation', 'Annual Report', 'File annual report with state', 'annual', 'CA', 'CPA', NULL),
('US', 'United States', 'S-Corporation', 'Tax Returns', 'File S-Corporation tax returns', 'annual', 'CA', 'CPA', NULL),

-- LLC rules
('US', 'United States', 'Limited Liability Company', 'Articles of Organization', 'File Articles of Organization with state', 'first-year', 'CA', 'CPA', NULL),
('US', 'United States', 'Limited Liability Company', 'Operating Agreement', 'Adopt operating agreement', 'first-year', 'CS', NULL, 'Company Secretary'),
('US', 'United States', 'Limited Liability Company', 'Annual Report', 'File annual report with state', 'annual', 'CA', 'CPA', NULL),
('US', 'United States', 'Limited Liability Company', 'Tax Returns', 'File LLC tax returns', 'annual', 'CA', 'CPA', NULL),

-- Partnership rules
('US', 'United States', 'Partnership', 'Partnership Agreement', 'Adopt partnership agreement', 'first-year', 'CS', NULL, 'Company Secretary'),
('US', 'United States', 'Partnership', 'Annual Report', 'File annual report with state', 'annual', 'CA', 'CPA', NULL),
('US', 'United States', 'Partnership', 'Tax Returns', 'File partnership tax returns', 'annual', 'CA', 'CPA', NULL)

ON CONFLICT (country_code, company_type, compliance_name) DO NOTHING;

-- Verify the data was inserted
SELECT 'Verification - US company types after insert:' as info;
SELECT 
    company_type, 
    COUNT(*) as rule_count,
    array_agg(compliance_name) as compliance_rules
FROM compliance_rules_comprehensive 
WHERE country_code = 'US' 
GROUP BY company_type
ORDER BY company_type;
