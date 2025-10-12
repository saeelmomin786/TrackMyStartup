-- =====================================================
-- NEW EMPLOYEE SALARY FIX
-- This script ensures that new employees are properly
-- included in monthly salary expenditure calculations
-- =====================================================

-- 1. Ensure the insert_monthly_salary_expenses_for_startup function exists and works correctly
CREATE OR REPLACE FUNCTION insert_monthly_salary_expenses_for_startup(p_startup_id INTEGER, p_run_date DATE DEFAULT CURRENT_DATE)
RETURNS INTEGER AS $$
DECLARE
    v_month_start DATE := date_trunc('month', p_run_date)::date;
    v_month_end   DATE := (date_trunc('month', p_run_date) + INTERVAL '1 month - 1 day')::date;
    rec RECORD;
    v_amount DECIMAL(15,2);
    v_inserted INTEGER := 0;
BEGIN
    FOR rec IN
        SELECT e.*
        FROM employees e
        WHERE e.startup_id = p_startup_id
          AND e.joining_date <= v_month_end
          AND (e.termination_date IS NULL OR e.termination_date >= v_month_start)
    LOOP
        v_amount := get_employee_current_salary(rec.id, v_month_end);
        IF COALESCE(v_amount, 0) <= 0 THEN
            CONTINUE;
        END IF;

        -- Prevent duplicate for this employee in this month by matching on description and month
        IF NOT EXISTS (
            SELECT 1 FROM financial_records fr
            WHERE fr.startup_id = p_startup_id
              AND fr.record_type = 'expense'
              AND fr.entity = rec.entity
              AND fr.description = ('Monthly Salary - ' || rec.name)
              AND fr.date >= v_month_start AND fr.date <= v_month_end
        ) THEN
            INSERT INTO financial_records (
                startup_id, record_type, date, entity, description, vertical, amount, funding_source, cogs, attachment_url
            ) VALUES (
                p_startup_id,
                'expense',
                v_month_end,
                rec.entity,
                'Monthly Salary - ' || rec.name,
                'Salaries',
                v_amount,
                'Revenue',
                NULL,
                NULL
            );
            v_inserted := v_inserted + 1;
        END IF;
    END LOOP;

    RETURN v_inserted;
END;
$$ LANGUAGE plpgsql;

-- 2. Ensure the get_employee_current_salary function exists and works correctly
CREATE OR REPLACE FUNCTION get_employee_current_salary(emp_id UUID, as_of DATE)
RETURNS DECIMAL(15,2) AS $$
DECLARE
    current_salary DECIMAL(15,2);
BEGIN
    -- Start with base salary
    SELECT e.salary INTO current_salary
    FROM employees e
    WHERE e.id = emp_id;

    -- Override with latest increment effective on/before as_of, if any
    SELECT ei.salary
    INTO current_salary
    FROM employees_increments ei
    WHERE ei.employee_id = emp_id
      AND ei.effective_date <= as_of
    ORDER BY ei.effective_date DESC
    LIMIT 1;

    RETURN COALESCE(current_salary, 0);
END;
$$ LANGUAGE plpgsql;

-- 3. Create a function to manually refresh all financial records for a startup
CREATE OR REPLACE FUNCTION refresh_all_salary_records_for_startup(p_startup_id INTEGER)
RETURNS INTEGER AS $$
DECLARE
    v_total_inserted INTEGER := 0;
    v_current_month DATE := date_trunc('month', CURRENT_DATE)::date;
    v_next_month DATE := (v_current_month + INTERVAL '1 month')::date;
    v_month_after_next DATE := (v_current_month + INTERVAL '2 months')::date;
    v_count INTEGER;
BEGIN
    -- Refresh current month
    SELECT insert_monthly_salary_expenses_for_startup(p_startup_id, v_current_month) INTO v_count;
    v_total_inserted := v_total_inserted + COALESCE(v_count, 0);
    
    -- Refresh next month
    SELECT insert_monthly_salary_expenses_for_startup(p_startup_id, v_next_month) INTO v_count;
    v_total_inserted := v_total_inserted + COALESCE(v_count, 0);
    
    -- Refresh month after next
    SELECT insert_monthly_salary_expenses_for_startup(p_startup_id, v_month_after_next) INTO v_count;
    v_total_inserted := v_total_inserted + COALESCE(v_count, 0);
    
    RETURN v_total_inserted;
END;
$$ LANGUAGE plpgsql;

-- 4. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_financial_records_salary_dedupe
ON financial_records (startup_id, record_type, entity, description, date);

CREATE INDEX IF NOT EXISTS idx_emp_increments_employee_date 
ON employees_increments(employee_id, effective_date);

CREATE INDEX IF NOT EXISTS idx_employees_startup_joining_date
ON employees(startup_id, joining_date);

-- 5. Create a trigger to automatically create financial records when a new employee is added
CREATE OR REPLACE FUNCTION trigger_create_salary_records_on_employee_insert()
RETURNS TRIGGER AS $$
BEGIN
    -- Create financial records for the new employee
    PERFORM insert_monthly_salary_expenses_for_startup(NEW.startup_id, CURRENT_DATE);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS create_salary_records_on_employee_insert ON employees;

-- Create the trigger
CREATE TRIGGER create_salary_records_on_employee_insert
    AFTER INSERT ON employees
    FOR EACH ROW
    EXECUTE FUNCTION trigger_create_salary_records_on_employee_insert();

-- =====================================================
-- VERIFICATION QUERIES (for testing)
-- =====================================================

-- To test if the functions work:
-- 1. Check if financial records exist for a startup:
-- SELECT * FROM financial_records 
-- WHERE startup_id = your-startup-id 
-- AND record_type = 'expense' 
-- AND description LIKE 'Monthly Salary%'
-- ORDER BY date DESC;

-- 2. Test the insert function manually:
-- SELECT insert_monthly_salary_expenses_for_startup(your-startup-id, CURRENT_DATE);

-- 3. Test the refresh function:
-- SELECT refresh_all_salary_records_for_startup(your-startup-id);

-- 4. Check current effective salary for an employee:
-- SELECT get_employee_current_salary('your-employee-id', CURRENT_DATE);

-- =====================================================
-- CLEANUP (if needed)
-- =====================================================

-- If you need to clean up existing financial records and recreate them:
-- DELETE FROM financial_records 
-- WHERE startup_id = your-startup-id 
-- AND record_type = 'expense' 
-- AND description LIKE 'Monthly Salary%';

-- Then run:
-- SELECT refresh_all_salary_records_for_startup(your-startup-id);
