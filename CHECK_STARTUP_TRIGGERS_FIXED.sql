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

-- Query 3: Check share creation pattern (FIXED - removed ss.id)
SELECT 
  s.id AS startup_id,
  s.name AS startup_name,
  s.created_at AS startup_created,
  ss.startup_id AS shares_startup_id,
  ss.shares,
  ss.price_per_share,
  ss.created_at AS shares_created,
  CASE 
    WHEN ss.created_at IS NOT NULL AND s.created_at IS NOT NULL 
    THEN EXTRACT(EPOCH FROM (ss.created_at - s.created_at)) / 60
    ELSE NULL 
  END AS minutes_between_startup_and_shares
FROM startups s
LEFT JOIN startup_shares ss ON ss.startup_id = s.id
ORDER BY s.id DESC
LIMIT 10;
