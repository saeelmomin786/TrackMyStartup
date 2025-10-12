-- =====================================================
-- SALARY INCREMENT FIX
-- This script ensures that salary increments are properly
-- reflected in monthly expenditure calculations
-- =====================================================

-- 1. Ensure the trigger exists and is working
DROP TRIGGER IF EXISTS update_salary_records_on_increment ON employees_increments;

CREATE TRIGGER update_salary_records_on_increment
    AFTER INSERT ON employees_increments
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_salary_records_on_increment();

-- 2. Ensure the update function exists and is working
CREATE OR REPLACE FUNCTION update_future_salary_records_for_employee(
    p_employee_id UUID,
    p_effective_date DATE
)
RETURNS INTEGER AS $$
DECLARE
    emp RECORD;
    v_new_salary DECIMAL(15,2);
    v_updated_count INTEGER := 0;
    v_month_start DATE;
    v_month_end DATE;
BEGIN
    -- Get employee details
    SELECT e.*, s.id as startup_id INTO emp
    FROM employees e
    JOIN startups s ON e.startup_id = s.id
    WHERE e.id = p_employee_id;
    
    IF NOT FOUND THEN
        RETURN 0;
    END IF;
    
    -- Get the new salary from the increment
    v_new_salary := get_employee_current_salary(p_employee_id, p_effective_date);
    
    -- Update all future salary records for this employee
    -- Find all salary records from the effective date onwards
    FOR v_month_start IN 
        SELECT date_trunc('month', generate_series(
            date_trunc('month', p_effective_date)::date,
            date_trunc('month', CURRENT_DATE + INTERVAL '1 year')::date,
            '1 month'::interval
        ))::date
    LOOP
        v_month_end := (v_month_start + INTERVAL '1 month - 1 day')::date;
        
        -- Update existing salary record for this month if it exists
        UPDATE financial_records 
        SET amount = v_new_salary,
            updated_at = NOW()
        WHERE startup_id = emp.startup_id
          AND record_type = 'expense'
          AND entity = emp.entity
          AND description = ('Monthly Salary - ' || emp.name)
          AND date >= v_month_start 
          AND date <= v_month_end
          AND amount != v_new_salary; -- Only update if amount changed
        
        IF FOUND THEN
            v_updated_count := v_updated_count + 1;
        END IF;
    END LOOP;
    
    RETURN v_updated_count;
END;
$$ LANGUAGE plpgsql;

-- 3. Ensure the get_employee_current_salary function exists
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

-- 4. Ensure the insert_monthly_salary_expenses_for_startup function exists
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

-- 5. Test the functions (optional - can be run manually)
-- SELECT 'Functions created successfully' as status;

-- 6. Create index for better performance
CREATE INDEX IF NOT EXISTS idx_financial_records_salary_dedupe
ON financial_records (startup_id, record_type, entity, description, date);

-- 7. Create index for employee increments
CREATE INDEX IF NOT EXISTS idx_emp_increments_employee_date 
ON employees_increments(employee_id, effective_date);

-- =====================================================
-- VERIFICATION QUERIES (for testing)
-- =====================================================

-- To test if the functions work:
-- 1. Check if an employee has increments:
-- SELECT * FROM employees_increments WHERE employee_id = 'your-employee-id';

-- 2. Check current effective salary:
-- SELECT get_employee_current_salary('your-employee-id', CURRENT_DATE);

-- 3. Check financial records for a startup:
-- SELECT * FROM financial_records 
-- WHERE startup_id = your-startup-id 
-- AND record_type = 'expense' 
-- AND description LIKE 'Monthly Salary%'
-- ORDER BY date DESC;

-- 4. Test the update function:
-- SELECT update_future_salary_records_for_employee('your-employee-id', '2024-01-01');
