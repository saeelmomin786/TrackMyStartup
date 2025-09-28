-- Fix Investment Advisor Triggers
-- This script fixes the triggers to use the correct field names

-- 1. Drop existing triggers
DROP TRIGGER IF EXISTS trigger_update_investment_advisor_relationship ON users;
DROP TRIGGER IF EXISTS trigger_update_startup_investment_advisor_relationship ON startups;

-- 2. Create corrected function for user relationships
CREATE OR REPLACE FUNCTION update_investment_advisor_relationship()
RETURNS TRIGGER AS $$
BEGIN
    -- If user is an investor and has an investment advisor code ENTERED
    IF NEW.role = 'Investor' AND NEW.investment_advisor_code_entered IS NOT NULL THEN
        INSERT INTO investment_advisor_relationships (
            investment_advisor_id,
            investor_id,
            relationship_type
        ) VALUES (
            (SELECT id FROM users WHERE investment_advisor_code = NEW.investment_advisor_code_entered AND role = 'Investment Advisor' LIMIT 1),
            NEW.id,
            'advisor_investor'
        ) ON CONFLICT (investment_advisor_id, investor_id, relationship_type) DO NOTHING;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Create corrected function for startup relationships
CREATE OR REPLACE FUNCTION update_startup_investment_advisor_relationship()
RETURNS TRIGGER AS $$
BEGIN
    -- If startup has an investment advisor code
    IF NEW.investment_advisor_code IS NOT NULL THEN
        INSERT INTO investment_advisor_relationships (
            investment_advisor_id,
            startup_id,
            relationship_type
        ) VALUES (
            (SELECT id FROM users WHERE investment_advisor_code = NEW.investment_advisor_code AND role = 'Investment Advisor' LIMIT 1),
            NEW.id,
            'advisor_startup'
        ) ON CONFLICT (investment_advisor_id, startup_id, relationship_type) DO NOTHING;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Recreate triggers with correct field names
CREATE TRIGGER trigger_update_investment_advisor_relationship
    AFTER UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_investment_advisor_relationship();

CREATE TRIGGER trigger_update_startup_investment_advisor_relationship
    AFTER UPDATE ON startups
    FOR EACH ROW
    EXECUTE FUNCTION update_startup_investment_advisor_relationship();

-- 5. Create function to manually create relationships for existing data
CREATE OR REPLACE FUNCTION create_existing_investment_advisor_relationships()
RETURNS TEXT AS $$
DECLARE
    investor_count INTEGER := 0;
    startup_count INTEGER := 0;
BEGIN
    -- Create relationships for existing investors with codes
    INSERT INTO investment_advisor_relationships (investment_advisor_id, investor_id, relationship_type)
    SELECT 
        advisor.id as investment_advisor_id,
        investor.id as investor_id,
        'advisor_investor' as relationship_type
    FROM users investor
    JOIN users advisor ON advisor.investment_advisor_code = investor.investment_advisor_code_entered
    WHERE investor.role = 'Investor' 
      AND investor.investment_advisor_code_entered IS NOT NULL
      AND advisor.role = 'Investment Advisor'
    ON CONFLICT (investment_advisor_id, investor_id, relationship_type) DO NOTHING;
    
    GET DIAGNOSTICS investor_count = ROW_COUNT;
    
    -- Create relationships for existing startups with codes
    INSERT INTO investment_advisor_relationships (investment_advisor_id, startup_id, relationship_type)
    SELECT 
        advisor.id as investment_advisor_id,
        startup.id as startup_id,
        'advisor_startup' as relationship_type
    FROM startups startup
    JOIN users advisor ON advisor.investment_advisor_code = startup.investment_advisor_code
    WHERE startup.investment_advisor_code IS NOT NULL
      AND advisor.role = 'Investment Advisor'
    ON CONFLICT (investment_advisor_id, startup_id, relationship_type) DO NOTHING;
    
    GET DIAGNOSTICS startup_count = ROW_COUNT;
    
    RETURN 'Created ' || investor_count || ' investor relationships and ' || startup_count || ' startup relationships';
END;
$$ LANGUAGE plpgsql;

-- 6. Execute the function to create existing relationships
SELECT create_existing_investment_advisor_relationships();

-- 7. Verify the relationships were created
SELECT 
    'Verification' as info,
    COUNT(*) as total_relationships,
    COUNT(CASE WHEN relationship_type = 'advisor_investor' THEN 1 END) as investor_relationships,
    COUNT(CASE WHEN relationship_type = 'advisor_startup' THEN 1 END) as startup_relationships
FROM investment_advisor_relationships;


