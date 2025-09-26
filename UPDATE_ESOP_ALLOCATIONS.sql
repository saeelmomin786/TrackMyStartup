-- =====================================================
-- UPDATE ESOP ALLOCATIONS - FLEXIBLE SCRIPT
-- =====================================================
-- This script allows you to update ESOP allocations for employees
-- and modify ESOP reserved shares

-- =====================================================
-- STEP 1: VIEW CURRENT ESOP ALLOCATIONS
-- =====================================================

-- Check current ESOP allocations for a specific startup
-- Replace 88 with your startup ID
SELECT 
    '=== CURRENT ESOP ALLOCATIONS ===' as status,
    e.id,
    e.name,
    e.esop_allocation,
    e.allocation_type,
    e.esop_per_allocation
FROM employees e
WHERE e.startup_id = 88  -- Change this to your startup ID
ORDER BY e.name;

-- =====================================================
-- STEP 2: UPDATE INDIVIDUAL EMPLOYEE ESOP ALLOCATION
-- =====================================================

-- Update a specific employee's ESOP allocation
-- Replace the values as needed
UPDATE employees 
SET 
    esop_allocation = 5000,  -- New total ESOP allocation in USD
    esop_per_allocation = 5000,  -- ESOP per allocation period
    allocation_type = 'one-time',  -- one-time, annually, quarterly, monthly
    updated_at = NOW()
WHERE id = 'employee_id_here'  -- Replace with actual employee ID
AND startup_id = 88;  -- Replace with your startup ID

-- =====================================================
-- STEP 3: UPDATE ESOP RESERVED SHARES
-- =====================================================

-- Update the total ESOP reserved shares for a startup
-- Replace 88 with your startup ID and 20000 with desired shares
UPDATE startup_shares 
SET 
    esop_reserved_shares = 20000,  -- New ESOP reserved shares
    updated_at = NOW()
WHERE startup_id = 88;  -- Replace with your startup ID

-- =====================================================
-- STEP 4: BULK UPDATE ALL EMPLOYEES (OPTIONAL)
-- =====================================================

-- Example: Increase all employee ESOP allocations by 10%
-- Uncomment and modify as needed
/*
UPDATE employees 
SET 
    esop_allocation = esop_allocation * 1.1,  -- 10% increase
    esop_per_allocation = esop_per_allocation * 1.1,
    updated_at = NOW()
WHERE startup_id = 88;  -- Replace with your startup ID
*/

-- =====================================================
-- STEP 5: ADD NEW EMPLOYEE WITH ESOP
-- =====================================================

-- Add a new employee with ESOP allocation
-- Replace values as needed
INSERT INTO employees (
    startup_id,
    name,
    joining_date,
    entity,
    department,
    salary,
    esop_allocation,
    allocation_type,
    esop_per_allocation,
    created_at,
    updated_at
) VALUES (
    88,  -- Replace with your startup ID
    'New Employee Name',
    '2025-01-01',  -- Joining date
    'Parent Company',
    'Engineering',
    100000,  -- Annual salary
    10000,   -- Total ESOP allocation in USD
    'one-time',  -- Allocation type
    10000,   -- ESOP per allocation
    NOW(),
    NOW()
);

-- =====================================================
-- STEP 6: VERIFICATION
-- =====================================================

-- Check updated ESOP allocations
SELECT 
    '=== UPDATED ESOP ALLOCATIONS ===' as status,
    e.id,
    e.name,
    e.esop_allocation,
    e.allocation_type,
    e.esop_per_allocation,
    ss.esop_reserved_shares,
    ss.total_shares,
    ROUND(ss.price_per_share, 4) as price_per_share
FROM employees e
JOIN startup_shares ss ON e.startup_id = ss.startup_id
WHERE e.startup_id = 88  -- Replace with your startup ID
ORDER BY e.name;

-- =====================================================
-- STEP 7: ESOP UTILIZATION SUMMARY
-- =====================================================

-- Check ESOP utilization
SELECT 
    '=== ESOP UTILIZATION SUMMARY ===' as status,
    ss.startup_id,
    ss.esop_reserved_shares,
    ss.total_shares,
    ROUND(ss.price_per_share, 4) as price_per_share,
    (ss.esop_reserved_shares * ss.price_per_share) as reserved_esop_value,
    SUM(e.esop_allocation) as total_allocated_esop_value,
    COUNT(e.id) as total_employees_with_esop,
    ROUND((SUM(e.esop_allocation) / (ss.esop_reserved_shares * ss.price_per_share)) * 100, 2) as utilization_percentage
FROM startup_shares ss
LEFT JOIN employees e ON ss.startup_id = e.startup_id
WHERE ss.startup_id = 88  -- Replace with your startup ID
GROUP BY ss.startup_id, ss.esop_reserved_shares, ss.total_shares, ss.price_per_share;
