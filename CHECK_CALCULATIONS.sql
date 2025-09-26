-- =====================================================
-- CHECK CALCULATIONS FOR DASHBOARD ACCURACY
-- =====================================================

-- Check startup data for Synora (ID 88)
SELECT 
    s.id,
    s.name,
    s.total_funding,
    s.current_valuation,
    ss.total_shares,
    ss.esop_reserved_shares,
    ss.price_per_share
FROM startups s
LEFT JOIN startup_shares ss ON s.id = ss.startup_id
WHERE s.id = 88;

-- Check investment records
SELECT 
    ir.id,
    ir.investment_type,
    ir.amount,
    ir.shares,
    ir.post_money_valuation,
    ir.date
FROM investment_records ir
WHERE ir.startup_id = 88
ORDER BY ir.date DESC;

-- Check founders data
SELECT 
    f.id,
    f.name,
    f.shares,
    f.percentage
FROM founders f
WHERE f.startup_id = 88;

-- Check financial records
SELECT 
    fr.id,
    fr.record_type,
    fr.amount,
    fr.date,
    fr.vertical
FROM financial_records fr
WHERE fr.startup_id = 88
ORDER BY fr.date DESC;

-- Summary calculations
SELECT 
    'Investment Records Total' as metric,
    SUM(ir.amount) as total_amount
FROM investment_records ir
WHERE ir.startup_id = 88

UNION ALL

SELECT 
    'Financial Records Revenue' as metric,
    SUM(fr.amount) as total_amount
FROM financial_records fr
WHERE fr.startup_id = 88 AND fr.record_type = 'revenue'

UNION ALL

SELECT 
    'Financial Records Expenses' as metric,
    SUM(fr.amount) as total_amount
FROM financial_records fr
WHERE fr.startup_id = 88 AND fr.record_type = 'expense'

UNION ALL

SELECT 
    'Founders Total Shares' as metric,
    SUM(f.shares) as total_amount
FROM founders f
WHERE f.startup_id = 88

UNION ALL

SELECT 
    'Investment Records Total Shares' as metric,
    SUM(ir.shares) as total_amount
FROM investment_records ir
WHERE ir.startup_id = 88;
