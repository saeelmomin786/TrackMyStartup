-- Quick check: Which functions are the triggers using?
SELECT 
    t.tgname as trigger_name,
    t.tgrelid::regclass as table_name,
    p.proname as function_name,
    CASE 
        WHEN p.proname = 'update_shares_and_valuation_on_equity_change' THEN '✅ New comprehensive function'
        ELSE '⚠️ Old function'
    END as status
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE t.tgname IN (
    'trigger_update_shares_on_mentor_equity_change',
    'trigger_update_shares_on_recognition_change',
    'trigger_update_shares_on_investment_change',
    'trigger_update_shares_on_founder_change'
)
ORDER BY t.tgname;

