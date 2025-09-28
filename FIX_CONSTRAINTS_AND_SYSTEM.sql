-- Fix constraints and create the automatic system
-- This will add the necessary unique constraints and create the automatic system

-- =====================================================
-- 1. ADD MISSING UNIQUE CONSTRAINTS
-- =====================================================

-- Add unique constraint for investment_offers table
ALTER TABLE investment_offers 
ADD CONSTRAINT unique_startup_investor_email 
UNIQUE (startup_id, investor_email);

-- Add unique constraint for investment_advisor_relationships table (if not exists)
ALTER TABLE investment_advisor_relationships 
ADD CONSTRAINT unique_advisor_startup_relationship 
UNIQUE (investment_advisor_id, startup_id, relationship_type);

-- =====================================================
-- 2. CREATE AUTOMATIC RELATIONSHIP SYSTEM (FIXED VERSION)
-- =====================================================

-- Function to automatically create advisor-startup relationships
CREATE OR REPLACE FUNCTION create_advisor_relationships_automatically()
RETURNS TRIGGER AS $$
BEGIN
  -- When a startup gets an advisor code, create the relationship
  IF NEW.investment_advisor_code IS NOT NULL AND OLD.investment_advisor_code IS NULL THEN
    -- Find the advisor with this code
    INSERT INTO investment_advisor_relationships (investment_advisor_id, startup_id, relationship_type)
    SELECT 
      advisor.id as investment_advisor_id,
      NEW.id as startup_id,
      'advisor_startup' as relationship_type
    FROM users advisor
    WHERE advisor.investment_advisor_code = NEW.investment_advisor_code
      AND advisor.role IN ('Investment Advisor', 'Admin')
    ON CONFLICT (investment_advisor_id, startup_id, relationship_type) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for startups
DROP TRIGGER IF EXISTS trigger_create_startup_advisor_relationships ON startups;
CREATE TRIGGER trigger_create_startup_advisor_relationships
  AFTER UPDATE OF investment_advisor_code ON startups
  FOR EACH ROW
  EXECUTE FUNCTION create_advisor_relationships_automatically();

-- =====================================================
-- 3. CREATE TRIGGER FOR AUTOMATIC OFFER CREATION (FIXED VERSION)
-- =====================================================

-- Function to automatically create investment offers
CREATE OR REPLACE FUNCTION create_investment_offers_automatically()
RETURNS TRIGGER AS $$
DECLARE
  advisor_data RECORD;
  startup_data RECORD;
BEGIN
  -- Get advisor details
  SELECT name, email, investment_advisor_code
  FROM users 
  WHERE id = NEW.investment_advisor_id
  INTO advisor_data;
  
  -- Get startup details
  SELECT name, user_id
  FROM startups 
  WHERE id = NEW.startup_id
  INTO startup_data;
  
  -- Create investment offer if it doesn't exist
  INSERT INTO investment_offers (
    startup_id,
    startup_name,
    investor_email,
    investor_name,
    offer_amount,
    equity_percentage,
    status,
    created_at
  )
  VALUES (
    NEW.startup_id,
    startup_data.name,
    advisor_data.email,
    advisor_data.name,
    0, -- Default amount
    0, -- Default equity
    'pending',
    NOW()
  )
  ON CONFLICT (startup_id, investor_email) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for relationships
DROP TRIGGER IF EXISTS trigger_create_investment_offers ON investment_advisor_relationships;
CREATE TRIGGER trigger_create_investment_offers
  AFTER INSERT ON investment_advisor_relationships
  FOR EACH ROW
  WHEN (NEW.relationship_type = 'advisor_startup')
  EXECUTE FUNCTION create_investment_offers_automatically();

-- =====================================================
-- 4. CREATE FUNCTION FOR MANUAL RELATIONSHIP CREATION (FIXED VERSION)
-- =====================================================

-- Function to create relationships for existing data
CREATE OR REPLACE FUNCTION create_missing_relationships()
RETURNS TABLE(
  created_count INTEGER,
  message TEXT
) AS $$
DECLARE
  relationship_count INTEGER := 0;
BEGIN
  -- Create relationships for startups with advisor codes
  INSERT INTO investment_advisor_relationships (investment_advisor_id, startup_id, relationship_type)
  SELECT 
    advisor.id as investment_advisor_id,
    s.id as startup_id,
    'advisor_startup' as relationship_type
  FROM startups s
  JOIN users advisor ON advisor.investment_advisor_code = s.investment_advisor_code
  WHERE s.investment_advisor_code IS NOT NULL
    AND advisor.role IN ('Investment Advisor', 'Admin')
  ON CONFLICT (investment_advisor_id, startup_id, relationship_type) DO NOTHING;
  
  GET DIAGNOSTICS relationship_count = ROW_COUNT;
  
  RETURN QUERY SELECT relationship_count, 'Created ' || relationship_count || ' advisor-startup relationships';
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 5. CREATE FUNCTION FOR MANUAL OFFER CREATION (FIXED VERSION)
-- =====================================================

-- Function to create offers for existing relationships
CREATE OR REPLACE FUNCTION create_missing_offers()
RETURNS TABLE(
  created_count INTEGER,
  message TEXT
) AS $$
DECLARE
  offer_count INTEGER := 0;
BEGIN
  -- Create offers for existing relationships
  INSERT INTO investment_offers (
    startup_id,
    startup_name,
    investor_email,
    investor_name,
    offer_amount,
    equity_percentage,
    status,
    created_at
  )
  SELECT 
    r.startup_id,
    s.name as startup_name,
    advisor.email as investor_email,
    advisor.name as investor_name,
    0 as offer_amount,
    0 as equity_percentage,
    'pending' as status,
    NOW() as created_at
  FROM investment_advisor_relationships r
  JOIN users advisor ON advisor.id = r.investment_advisor_id
  JOIN startups s ON s.id = r.startup_id
  WHERE r.relationship_type = 'advisor_startup'
    AND NOT EXISTS (
      SELECT 1 FROM investment_offers o 
      WHERE o.startup_id = r.startup_id 
        AND o.investor_email = advisor.email
    )
  ON CONFLICT (startup_id, investor_email) DO NOTHING;
  
  GET DIAGNOSTICS offer_count = ROW_COUNT;
  
  RETURN QUERY SELECT offer_count, 'Created ' || offer_count || ' investment offers';
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 6. TEST THE SYSTEM
-- =====================================================

-- Test the manual functions
SELECT * FROM create_missing_relationships();
SELECT * FROM create_missing_offers();

-- Show final results
SELECT 
  'System Status' as info,
  'Relationships' as type,
  COUNT(*) as count
FROM investment_advisor_relationships

UNION ALL

SELECT 
  'System Status' as info,
  'Offers' as type,
  COUNT(*) as count
FROM investment_offers;
