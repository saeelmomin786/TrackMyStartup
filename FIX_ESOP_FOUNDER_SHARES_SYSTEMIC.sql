-- =====================================================
-- SYSTEMIC FIX FOR ESOP AND FOUNDER SHARES
-- =====================================================
-- This script fixes the issue where ESOP reserved shares and founder shares
-- are not properly calculated during registration, affecting all startups

-- First, let's see the current state of all startups
SELECT 
    'CURRENT STATE' as status,
    s.id as startup_id,
    s.name as startup_name,
    ss.total_shares,
    ss.esop_reserved_shares,
    ss.price_per_share,
    f.shares as founder_shares,
    f.name as founder_name,
    CASE 
        WHEN ss.total_shares > 0 THEN ROUND((f.shares::numeric / ss.total_shares::numeric) * 100, 2)
        ELSE 0 
    END as founder_equity_percentage,
    CASE 
        WHEN ss.total_shares > 0 THEN ROUND((ss.esop_reserved_shares::numeric / ss.total_shares::numeric) * 100, 2)
        ELSE 0 
    END as esop_equity_percentage
FROM startups s
LEFT JOIN startup_shares ss ON s.id = ss.startup_id
LEFT JOIN founders f ON s.id = f.startup_id
WHERE ss.total_shares > 0
ORDER BY s.id;

-- =====================================================
-- STEP 1: IDENTIFY PROBLEMATIC STARTUPS
-- =====================================================
-- Find startups where founder shares + ESOP reserved shares ≠ total shares
WITH problematic_startups AS (
    SELECT 
        s.id as startup_id,
        s.name as startup_name,
        ss.total_shares,
        ss.esop_reserved_shares,
        COALESCE(SUM(f.shares), 0) as total_founder_shares,
        ss.esop_reserved_shares + COALESCE(SUM(f.shares), 0) as total_allocated_shares,
        ss.total_shares - (ss.esop_reserved_shares + COALESCE(SUM(f.shares), 0)) as difference
    FROM startups s
    LEFT JOIN startup_shares ss ON s.id = ss.startup_id
    LEFT JOIN founders f ON s.id = f.startup_id
    WHERE ss.total_shares > 0
    GROUP BY s.id, s.name, ss.total_shares, ss.esop_reserved_shares
    HAVING ss.esop_reserved_shares + COALESCE(SUM(f.shares), 0) != ss.total_shares
)
SELECT 
    'PROBLEMATIC STARTUPS' as status,
    startup_id,
    startup_name,
    total_shares,
    esop_reserved_shares,
    total_founder_shares,
    total_allocated_shares,
    difference,
    CASE 
        WHEN difference > 0 THEN 'UNDER-ALLOCATED (shares available)'
        WHEN difference < 0 THEN 'OVER-ALLOCATED (shares exceed total)'
        ELSE 'EXACT MATCH'
    END as issue_type
FROM problematic_startups
ORDER BY ABS(difference) DESC;

-- =====================================================
-- STEP 2: FIX ESOP RESERVED SHARES
-- =====================================================
-- Fix cases where ESOP reserved shares are incorrectly set to total shares
-- (This happens when the registration form doesn't properly calculate ESOP shares)

-- Update ESOP reserved shares to reasonable defaults for problematic cases
UPDATE startup_shares 
SET 
    esop_reserved_shares = CASE 
        -- If ESOP reserved equals total shares, set to 10% of total shares
        WHEN esop_reserved_shares = total_shares THEN ROUND(total_shares * 0.1)
        -- If ESOP reserved is 0 but total shares > 100000, set to 10% of total shares
        WHEN esop_reserved_shares = 0 AND total_shares > 100000 THEN ROUND(total_shares * 0.1)
        -- If ESOP reserved is too high (>50% of total), cap at 20%
        WHEN esop_reserved_shares > (total_shares * 0.5) THEN ROUND(total_shares * 0.2)
        -- Otherwise keep current value
        ELSE esop_reserved_shares
    END,
    updated_at = NOW()
WHERE 
    -- Only update problematic cases
    (esop_reserved_shares = total_shares) OR
    (esop_reserved_shares = 0 AND total_shares > 100000) OR
    (esop_reserved_shares > (total_shares * 0.5));

-- =====================================================
-- STEP 3: FIX FOUNDER SHARES
-- =====================================================
-- Update founder shares to ensure total allocation equals total shares
-- This distributes the remaining shares among founders

-- For startups with only one founder, give them all remaining shares
UPDATE founders 
SET shares = (
    SELECT ss.total_shares - ss.esop_reserved_shares
    FROM startup_shares ss
    WHERE ss.startup_id = founders.startup_id
)
WHERE startup_id IN (
    SELECT startup_id 
    FROM founders 
    GROUP BY startup_id 
    HAVING COUNT(*) = 1
)
AND startup_id IN (
    SELECT s.id 
    FROM startups s
    JOIN startup_shares ss ON s.id = ss.startup_id
    WHERE ss.total_shares > 0
);

-- For startups with multiple founders, distribute remaining shares proportionally
-- (This is more complex and would require individual review)

-- =====================================================
-- STEP 4: VERIFY THE FIXES
-- =====================================================
-- Check the results after fixes
SELECT 
    'AFTER FIXES' as status,
    s.id as startup_id,
    s.name as startup_name,
    ss.total_shares,
    ss.esop_reserved_shares,
    f.shares as founder_shares,
    f.name as founder_name,
    CASE 
        WHEN ss.total_shares > 0 THEN ROUND((f.shares::numeric / ss.total_shares::numeric) * 100, 2)
        ELSE 0 
    END as founder_equity_percentage,
    CASE 
        WHEN ss.total_shares > 0 THEN ROUND((ss.esop_reserved_shares::numeric / ss.total_shares::numeric) * 100, 2)
        ELSE 0 
    END as esop_equity_percentage,
    ss.esop_reserved_shares + f.shares as total_allocated,
    ss.total_shares - (ss.esop_reserved_shares + f.shares) as remaining_shares
FROM startups s
LEFT JOIN startup_shares ss ON s.id = ss.startup_id
LEFT JOIN founders f ON s.id = f.startup_id
WHERE ss.total_shares > 0
ORDER BY s.id;

-- =====================================================
-- STEP 5: SUMMARY REPORT
-- =====================================================
-- Final summary of all startups
SELECT 
    'SUMMARY' as report_type,
    COUNT(*) as total_startups,
    COUNT(CASE WHEN ss.total_shares > 0 THEN 1 END) as startups_with_shares,
    COUNT(CASE WHEN ss.esop_reserved_shares + COALESCE(f.shares, 0) = ss.total_shares THEN 1 END) as properly_allocated,
    COUNT(CASE WHEN ss.esop_reserved_shares + COALESCE(f.shares, 0) != ss.total_shares THEN 1 END) as still_problematic,
    ROUND(AVG(CASE WHEN ss.total_shares > 0 THEN (ss.esop_reserved_shares::numeric / ss.total_shares::numeric) * 100 END), 2) as avg_esop_percentage,
    ROUND(AVG(CASE WHEN ss.total_shares > 0 THEN (f.shares::numeric / ss.total_shares::numeric) * 100 END), 2) as avg_founder_percentage
FROM startups s
LEFT JOIN startup_shares ss ON s.id = ss.startup_id
LEFT JOIN founders f ON s.id = f.startup_id
GROUP BY f.startup_id
HAVING COUNT(*) = 1; -- Only single-founder startups for this summary

-- =====================================================
-- NOTES FOR FUTURE PREVENTION
-- =====================================================
/*
PREVENTION MEASURES:

1. The registration form has been updated to auto-calculate founder shares
2. Validation has been added to ensure founder shares + ESOP reserved = total shares
3. This script should be run periodically to catch any edge cases

RECOMMENDED ESOP PERCENTAGES:
- Early stage startups: 10-15% of total shares
- Growth stage startups: 15-20% of total shares
- Mature startups: 10-12% of total shares

The script above sets ESOP to 10% of total shares for problematic cases,
which is a reasonable default for most startups.
*/
