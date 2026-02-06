-- Query 1: Check triggers on startups table
SELECT 
  t.tgname AS trigger_name,
  p.proname AS function_name,
  pg_get_triggerdef(t.oid) AS trigger_definition
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE t.tgrelid = 'startups'::regclass
AND NOT t.tgisinternal
ORDER BY t.tgname;

-- Query 2: Check share creation pattern with CORRECT column names
SELECT 
  s.id AS startup_id,
  s.name AS startup_name,
  s.created_at AS startup_created,
  ss.startup_id AS shares_startup_id,
  ss.total_shares,
  ss.esop_reserved_shares,
  ss.price_per_share,
  ss.updated_at AS shares_created,
  CASE 
    WHEN ss.updated_at IS NOT NULL AND s.created_at IS NOT NULL 
    THEN EXTRACT(EPOCH FROM (ss.updated_at - s.created_at)) / 60
    ELSE NULL 
  END AS minutes_between_startup_and_shares
FROM startups s
LEFT JOIN startup_shares ss ON ss.startup_id = s.id
ORDER BY s.id DESC
LIMIT 10;

-- Query 3: Check the trigger function that creates shares
SELECT 
  p.proname AS function_name,
  pg_get_functiondef(p.oid) AS function_definition
FROM pg_proc p
WHERE p.proname = 'update_shares_and_valuation_on_equity_change';
