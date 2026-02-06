-- Check the flow: What happens when startup registers vs when facilitator approves

-- FLOW 1: Startup Registration - Check initialization triggers
SELECT 
  p.proname AS function_name,
  pg_get_functiondef(p.oid) AS function_definition
FROM pg_proc p
WHERE p.proname IN ('initialize_startup_shares', 'initialize_startup_shares_for_new_startup')
ORDER BY p.proname;

-- FLOW 2: Recognition Approval - Already checked, uses update_shares_and_valuation_on_equity_change

-- Compare the two flows:
-- Registration: Should INSERT fresh startup_shares entry with default values
-- Approval: Should UPDATE existing startup_shares entry to recalculate totals

-- Check what startup 347 has vs a normal startup
SELECT 
  347 as check_startup,
  'Startup 347 - Problem case' as description
UNION ALL
SELECT 
  346 as check_startup,
  'Startup 346 - Normal case' as description;

-- See the actual share records
SELECT 
  s.id,
  s.name,
  s.created_at as startup_registered,
  ss.total_shares,
  ss.esop_reserved_shares,
  ss.price_per_share,
  ss.updated_at as shares_last_updated,
  EXTRACT(EPOCH FROM (ss.updated_at - s.created_at)) / 60 as minutes_after_registration
FROM startups s
JOIN startup_shares ss ON ss.startup_id = s.id
WHERE s.id IN (346, 347)
ORDER BY s.id;
