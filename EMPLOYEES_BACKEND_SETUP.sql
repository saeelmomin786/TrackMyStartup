-- =====================================================
-- EMPLOYEES BACKEND SETUP
-- =====================================================

-- Create employees table
CREATE TABLE IF NOT EXISTS employees (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    startup_id INTEGER NOT NULL REFERENCES startups(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    joining_date DATE NOT NULL,
    entity VARCHAR(100) NOT NULL,
    department VARCHAR(100) NOT NULL,
    salary DECIMAL(15,2) NOT NULL,
    esop_allocation DECIMAL(15,2) DEFAULT 0,
    allocation_type VARCHAR(20) DEFAULT 'one-time' CHECK (allocation_type IN ('one-time', 'annually', 'quarterly', 'monthly')),
    esop_per_allocation DECIMAL(15,2) DEFAULT 0,
    contract_url TEXT,
    termination_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- History of increments (salary and ESOP changes) per employee
CREATE TABLE IF NOT EXISTS employees_increments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    effective_date DATE NOT NULL,
    salary DECIMAL(15,2) NOT NULL,
    esop_allocation DECIMAL(15,2) DEFAULT 0,
    allocation_type VARCHAR(20) DEFAULT 'one-time' CHECK (allocation_type IN ('one-time', 'annually', 'quarterly', 'monthly')),
    esop_per_allocation DECIMAL(15,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_emp_increments_employee_date ON employees_increments(employee_id, effective_date);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_employees_startup_id ON employees(startup_id);
CREATE INDEX IF NOT EXISTS idx_employees_department ON employees(department);
CREATE INDEX IF NOT EXISTS idx_employees_joining_date ON employees(joining_date);
CREATE INDEX IF NOT EXISTS idx_employees_entity ON employees(entity);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_employees_updated_at ON employees;
CREATE TRIGGER update_employees_updated_at 
    BEFORE UPDATE ON employees 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- PAYROLL ➜ AUTOMATIC MONTHLY SALARY EXPENSES
-- =====================================================

-- Helper: get current salary for an employee as of a date
-- This considers both base salary and any increments effective on/before the date
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

-- Insert salary expense rows for all active employees of a startup for a given month
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
                'Salaries',  -- Changed from 'Payroll' to match your form's "Salaries" vertical
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

-- Insert salary expenses for all startups for a given month
CREATE OR REPLACE FUNCTION insert_monthly_salary_expenses_all(p_run_date DATE DEFAULT CURRENT_DATE)
RETURNS INTEGER AS $$
DECLARE
    s RECORD;
    v_total_inserted INTEGER := 0;
    v_count INTEGER;
BEGIN
    FOR s IN SELECT id FROM startups LOOP
        v_count := insert_monthly_salary_expenses_for_startup(s.id, p_run_date);
        v_total_inserted := v_total_inserted + COALESCE(v_count, 0);
    END LOOP;
    RETURN v_total_inserted;
END;
$$ LANGUAGE plpgsql;

-- Function to update existing salary records when salary increments are added
-- This should be called after adding a salary increment to update future months
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

-- Optional: index to speed up duplicate checks
CREATE INDEX IF NOT EXISTS idx_financial_records_salary_dedupe
ON financial_records (startup_id, record_type, entity, description, date);

-- Trigger to automatically update financial records when salary increments are added
CREATE OR REPLACE FUNCTION trigger_update_salary_records_on_increment()
RETURNS TRIGGER AS $$
BEGIN
    -- Update future salary records for this employee
    PERFORM update_future_salary_records_for_employee(NEW.employee_id, NEW.effective_date);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_salary_records_on_increment
    AFTER INSERT ON employees_increments
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_salary_records_on_increment();

-- Schedule the monthly job (1st day 00:05). Requires pg_cron.
DO $$
BEGIN
    PERFORM 1 FROM pg_extension WHERE extname = 'pg_cron';
    IF NOT FOUND THEN
        BEGIN
            CREATE EXTENSION IF NOT EXISTS pg_cron;
        EXCEPTION WHEN OTHERS THEN
            NULL; -- ignore if cannot create
        END;
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'monthly_salary_expenses') THEN
        PERFORM cron.unschedule('monthly_salary_expenses');
    END IF;
    PERFORM cron.schedule('monthly_salary_expenses', '5 0 1 * *', 'SELECT insert_monthly_salary_expenses_all(CURRENT_DATE);');
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;

-- Create RLS policies
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view their own startup employees" ON employees;
DROP POLICY IF EXISTS "Users can add employees to their own startups" ON employees;
DROP POLICY IF EXISTS "Users can update employees in their own startups" ON employees;
DROP POLICY IF EXISTS "Users can delete employees from their own startups" ON employees;
DROP POLICY IF EXISTS "Admins can view all employees" ON employees;
DROP POLICY IF EXISTS "CA can view all employees" ON employees;
DROP POLICY IF EXISTS "CS can view all employees" ON employees;

-- Policy: Users can only see employees for startups they own
CREATE POLICY "Users can view their own startup employees" ON employees
    FOR SELECT USING (
        startup_id IN (
            SELECT id FROM startups WHERE user_id = auth.uid()
        )
    );

-- Policy: Users can add employees to their own startups
CREATE POLICY "Users can add employees to their own startups" ON employees
    FOR INSERT WITH CHECK (
        startup_id IN (
            SELECT id FROM startups WHERE user_id = auth.uid()
        )
    );

-- Policy: Users can update employees in their own startups
CREATE POLICY "Users can update employees in their own startups" ON employees
    FOR UPDATE USING (
        startup_id IN (
            SELECT id FROM startups WHERE user_id = auth.uid()
        )
    );

-- Policy: Users can delete employees from their own startups
CREATE POLICY "Users can delete employees from their own startups" ON employees
    FOR DELETE USING (
        startup_id IN (
            SELECT id FROM startups WHERE user_id = auth.uid()
        )
    );

-- Admin can view all employees
CREATE POLICY "Admins can view all employees" ON employees
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users WHERE id = auth.uid() AND role = 'Admin'
        )
    );

-- CA can view all employees for compliance
CREATE POLICY "CA can view all employees" ON employees
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users WHERE id = auth.uid() AND role = 'CA'
        )
    );

-- CS can view all employees for compliance
CREATE POLICY "CS can view all employees" ON employees
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users WHERE id = auth.uid() AND role = 'CS'
        )
    );

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Drop existing functions to avoid conflicts
DROP FUNCTION IF EXISTS get_employee_summary(INTEGER);
DROP FUNCTION IF EXISTS get_employees_by_department(INTEGER);
DROP FUNCTION IF EXISTS get_monthly_salary_data(INTEGER, INTEGER);

-- Function to get employee summary statistics
CREATE OR REPLACE FUNCTION get_employee_summary(
    p_startup_id INTEGER
)
RETURNS TABLE (
    total_employees INTEGER,
    total_salary_expense DECIMAL(15,2),
    total_esop_allocated DECIMAL(15,2),
    avg_salary DECIMAL(15,2),
    avg_esop_allocation DECIMAL(15,2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::INTEGER as total_employees,
        COALESCE(SUM(salary), 0) as total_salary_expense,
        COALESCE(SUM(esop_allocation), 0) as total_esop_allocated,
        COALESCE(AVG(salary), 0) as avg_salary,
        COALESCE(AVG(esop_allocation), 0) as avg_esop_allocation
    FROM employees
    WHERE startup_id = p_startup_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get employees by department
CREATE OR REPLACE FUNCTION get_employees_by_department(
    p_startup_id INTEGER
)
RETURNS TABLE (
    department_name VARCHAR(100),
    employee_count INTEGER,
    total_salary DECIMAL(15,2),
    total_esop DECIMAL(15,2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        department as department_name,
        COUNT(*)::INTEGER as employee_count,
        COALESCE(SUM(salary), 0) as total_salary,
        COALESCE(SUM(esop_allocation), 0) as total_esop
    FROM employees
    WHERE startup_id = p_startup_id
    GROUP BY department
    ORDER BY employee_count DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get monthly salary data
CREATE OR REPLACE FUNCTION get_monthly_salary_data(
    p_startup_id INTEGER,
    p_year INTEGER
)
RETURNS TABLE (
    month_name TEXT,
    total_salary DECIMAL(15,2),
    total_esop DECIMAL(15,2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        TO_CHAR(DATE_TRUNC('month', joining_date), 'Mon') as month_name,
        COALESCE(SUM(salary), 0) as total_salary,
        COALESCE(SUM(esop_allocation), 0) as total_esop
    FROM employees
    WHERE startup_id = p_startup_id 
        AND EXTRACT(YEAR FROM joining_date) = p_year
    GROUP BY DATE_TRUNC('month', joining_date)
    ORDER BY DATE_TRUNC('month', joining_date);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- SAMPLE DATA INSERTION
-- =====================================================

-- Get the actual startup ID to use
DO $$
DECLARE
    actual_startup_id INTEGER;
BEGIN
    -- Get the first startup ID
    SELECT id INTO actual_startup_id FROM startups ORDER BY id LIMIT 1;
    
    -- If no startup exists, create one
    IF actual_startup_id IS NULL THEN
        INSERT INTO startups (name, total_funding, current_valuation, user_id)
        VALUES ('Sample Startup', 1000000, 5000000, (SELECT id FROM users LIMIT 1))
        RETURNING id INTO actual_startup_id;
    END IF;
    
    -- Insert sample employee data
    INSERT INTO employees (startup_id, name, joining_date, entity, department, salary, esop_allocation, allocation_type, esop_per_allocation) VALUES
    (actual_startup_id, 'John Doe', '2024-01-15', 'Parent Company', 'Engineering', 120000.00, 50000.00, 'one-time', 50000.00),
    (actual_startup_id, 'Jane Smith', '2024-02-01', 'Parent Company', 'Sales', 90000.00, 35000.00, 'one-time', 35000.00),
    (actual_startup_id, 'Mike Johnson', '2024-03-01', 'Parent Company', 'Engineering', 110000.00, 45000.00, 'one-time', 45000.00),
    (actual_startup_id, 'Sarah Wilson', '2024-04-01', 'Parent Company', 'Marketing', 85000.00, 30000.00, 'one-time', 30000.00),
    (actual_startup_id, 'David Brown', '2024-05-01', 'Parent Company', 'Operations', 95000.00, 40000.00, 'one-time', 40000.00)
    ON CONFLICT DO NOTHING;
    
    RAISE NOTICE 'Sample employee data inserted for startup ID: %', actual_startup_id;
END $$;

-- =====================================================
-- VERIFICATION
-- =====================================================

-- Verify table structure
SELECT 'Employee table structure:' as status;
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'employees' 
ORDER BY ordinal_position;

-- Verify sample data
SELECT 'Sample employee data:' as status;
SELECT 
    name,
    department,
    salary,
    esop_allocation,
    joining_date
FROM employees 
ORDER BY joining_date;

-- Test helper functions
SELECT 'Testing employee summary function:' as status;
DO $$
DECLARE
    test_startup_id INTEGER;
BEGIN
    SELECT startup_id INTO test_startup_id FROM employees ORDER BY created_at LIMIT 1;
    
    IF test_startup_id IS NOT NULL THEN
        RAISE NOTICE 'Testing employee summary for startup ID: %', test_startup_id;
        PERFORM * FROM get_employee_summary(test_startup_id);
    ELSE
        RAISE NOTICE 'No employees found for testing';
    END IF;
END $$;

-- =====================================================
-- USAGE EXAMPLES AND TESTING
-- =====================================================

-- Example 1: Manually run monthly salary insertion for a specific startup
-- SELECT insert_monthly_salary_expenses_for_startup(1, '2024-12-01');

-- Example 2: Run for all startups (useful for backfilling)
-- SELECT insert_monthly_salary_expenses_all('2024-12-01');

-- Example 3: Add a salary increment for an employee
-- INSERT INTO employees_increments (employee_id, effective_date, salary) 
-- VALUES ('employee-uuid-here', '2024-12-01', 150000.00);
-- (This will automatically update future salary records via trigger)

-- Example 4: Check current salary for an employee as of a date
-- SELECT get_employee_current_salary('employee-uuid-here', '2024-12-31');

-- Example 5: Manually update future salary records after an increment
-- SELECT update_future_salary_records_for_employee('employee-uuid-here', '2024-12-01');

SELECT 'Employees backend setup complete!' as status;
