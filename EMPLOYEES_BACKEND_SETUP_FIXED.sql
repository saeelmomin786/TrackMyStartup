-- =====================================================
-- EMPLOYEES BACKEND SETUP (FIXED VERSION)
-- =====================================================

-- Check if employees table exists
SELECT 'Checking if employees table exists...' as status;
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_name = 'employees'
) as table_exists;

-- Create employees table if it doesn't exist
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

-- Create indexes for better performance (IF NOT EXISTS)
CREATE INDEX IF NOT EXISTS idx_employees_startup_id ON employees(startup_id);
CREATE INDEX IF NOT EXISTS idx_employees_department ON employees(department);
CREATE INDEX IF NOT EXISTS idx_employees_joining_date ON employees(joining_date);
CREATE INDEX IF NOT EXISTS idx_employees_entity ON employees(entity);

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger only if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'update_employees_updated_at'
    ) THEN
        CREATE TRIGGER update_employees_updated_at 
            BEFORE UPDATE ON employees 
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- Enable RLS on employees table
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view their own startup employees" ON employees;
DROP POLICY IF EXISTS "Users can add employees to their own startups" ON employees;
DROP POLICY IF EXISTS "Users can update employees in their own startups" ON employees;
DROP POLICY IF EXISTS "Users can delete employees from their own startups" ON employees;
DROP POLICY IF EXISTS "Admins can view all employees" ON employees;
DROP POLICY IF EXISTS "CA can view all employees" ON employees;
DROP POLICY IF EXISTS "CS can view all employees" ON employees;

-- Create RLS policies
CREATE POLICY "Users can view their own startup employees" ON employees
    FOR SELECT USING (
        startup_id IN (
            SELECT id FROM startups WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can add employees to their own startups" ON employees
    FOR INSERT WITH CHECK (
        startup_id IN (
            SELECT id FROM startups WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update employees in their own startups" ON employees
    FOR UPDATE USING (
        startup_id IN (
            SELECT id FROM startups WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete employees from their own startups" ON employees
    FOR DELETE USING (
        startup_id IN (
            SELECT id FROM startups WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Admins can view all employees" ON employees
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users WHERE id = auth.uid() AND role = 'Admin'
        )
    );

CREATE POLICY "CA can view all employees" ON employees
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users WHERE id = auth.uid() AND role = 'CA'
        )
    );

CREATE POLICY "CS can view all employees" ON employees
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users WHERE id = auth.uid() AND role = 'CS'
        )
    );

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

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
-- SAMPLE DATA INSERTION (ONLY IF NO DATA EXISTS)
-- =====================================================

-- Check if sample data already exists
SELECT 'Checking for existing employee data...' as status;
SELECT COUNT(*) as existing_employees FROM employees;

-- Insert sample data only if no employees exist
DO $$
DECLARE
    actual_startup_id INTEGER;
    employee_count INTEGER;
BEGIN
    -- Count existing employees
    SELECT COUNT(*) INTO employee_count FROM employees;
    
    -- Only insert sample data if no employees exist
    IF employee_count = 0 THEN
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
        (actual_startup_id, 'David Brown', '2024-05-01', 'Parent Company', 'Operations', 95000.00, 40000.00, 'one-time', 40000.00);
        
        RAISE NOTICE 'Sample employee data inserted for startup ID: %', actual_startup_id;
    ELSE
        RAISE NOTICE 'Employee data already exists, skipping sample data insertion';
    END IF;
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

-- Verify existing data
SELECT 'Current employee data:' as status;
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

SELECT 'Employees backend setup complete!' as status;
