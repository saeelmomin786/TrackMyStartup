-- Check all triggers on startups table
SELECT 
  t.tgname AS trigger_name,
  p.proname AS function_name,
  pg_get_triggerdef(t.oid) AS trigger_definition
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE t.tgrelid = 'startups'::regclass
AND NOT t.tgisinternal
ORDER BY t.tgname;

-- Check all triggers on recognition_records table
SELECT 
  t.tgname AS trigger_name,
  p.proname AS function_name,
  pg_get_triggerdef(t.oid) AS trigger_definition
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE t.tgrelid = 'recognition_records'::regclass
AND NOT t.tgisinternal
ORDER BY t.tgname;

-- Check if startup_shares entries are created during startup registration
-- (Look at existing startups and their shares)
SELECT 
  s.id AS startup_id,
  s.name AS startup_name,
  s.created_at AS startup_created,
  ss.id AS shares_id,
  ss.shares,
  ss.price_per_share,
  ss.created_at AS shares_created
FROM startups s
LEFT JOIN startup_shares ss ON ss.startup_id = s.id
ORDER BY s.id DESC
LIMIT 10;
