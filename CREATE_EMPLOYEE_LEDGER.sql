-- =====================================================
-- CREATE EMPLOYEE LEDGER TABLE
-- =====================================================
-- This file creates the employee ledger table for monthly ESOP tracking

-- Create employee_ledger table
CREATE TABLE IF NOT EXISTS public.employee_ledger (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    ledger_date DATE NOT NULL,
    salary DECIMAL(15,2) NOT NULL,
    esop_allocated DECIMAL(15,2) NOT NULL,
    price_per_share DECIMAL(15,2) NOT NULL,
    number_of_shares INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_employee_ledger_employee_id ON public.employee_ledger(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_ledger_date ON public.employee_ledger(ledger_date);
CREATE INDEX IF NOT EXISTS idx_employee_ledger_employee_date ON public.employee_ledger(employee_id, ledger_date);

-- Create unique constraint to prevent duplicate entries
CREATE UNIQUE INDEX IF NOT EXISTS idx_employee_ledger_unique ON public.employee_ledger(employee_id, ledger_date);

-- Add comments for documentation
COMMENT ON TABLE public.employee_ledger IS 'Monthly ledger entries for employee ESOP tracking';
COMMENT ON COLUMN public.employee_ledger.ledger_date IS 'Date of the ledger entry (first day of the month)';
COMMENT ON COLUMN public.employee_ledger.salary IS 'Employee salary for that month';
COMMENT ON COLUMN public.employee_ledger.esop_allocated IS 'ESOP amount allocated for that month';
COMMENT ON COLUMN public.employee_ledger.price_per_share IS 'Price per share on that date';
COMMENT ON COLUMN public.employee_ledger.number_of_shares IS 'Number of shares allocated (esop_allocated / price_per_share)';

-- Enable RLS
ALTER TABLE public.employee_ledger ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view employee ledger for their own startups" ON public.employee_ledger;
DROP POLICY IF EXISTS "Users can insert employee ledger for their own startups" ON public.employee_ledger;
DROP POLICY IF EXISTS "Users can update employee ledger for their own startups" ON public.employee_ledger;
DROP POLICY IF EXISTS "Users can delete employee ledger for their own startups" ON public.employee_ledger;

-- Create RLS policies
CREATE POLICY "Users can view employee ledger for their own startups" ON public.employee_ledger
    FOR SELECT TO authenticated
    USING (
        employee_id IN (
            SELECT id FROM public.employees 
            WHERE startup_id IN (
                SELECT id FROM public.startups 
                WHERE user_id = auth.uid()
            )
        )
    );

CREATE POLICY "Users can insert employee ledger for their own startups" ON public.employee_ledger
    FOR INSERT TO authenticated
    WITH CHECK (
        employee_id IN (
            SELECT id FROM public.employees 
            WHERE startup_id IN (
                SELECT id FROM public.startups 
                WHERE user_id = auth.uid()
            )
        )
    );

CREATE POLICY "Users can update employee ledger for their own startups" ON public.employee_ledger
    FOR UPDATE TO authenticated
    USING (
        employee_id IN (
            SELECT id FROM public.employees 
            WHERE startup_id IN (
                SELECT id FROM public.startups 
                WHERE user_id = auth.uid()
            )
        )
    );

CREATE POLICY "Users can delete employee ledger for their own startups" ON public.employee_ledger
    FOR DELETE TO authenticated
    USING (
        employee_id IN (
            SELECT id FROM public.employees 
            WHERE startup_id IN (
                SELECT id FROM public.startups 
                WHERE user_id = auth.uid()
            )
        )
    );

-- Create function to generate monthly ledger entries
CREATE OR REPLACE FUNCTION generate_employee_ledger_entries(
    p_employee_id UUID,
    p_start_date DATE,
    p_end_date DATE
) RETURNS INTEGER AS $$
DECLARE
    loop_date DATE;
    entry_count INTEGER := 0;
    employee_record RECORD;
    effective_salary DECIMAL(15,2);
    effective_esop DECIMAL(15,2);
    effective_price_per_share DECIMAL(15,2);
    effective_number_of_shares INTEGER;
    monthly_esop DECIMAL(15,2);
BEGIN
    -- Get employee base data
    SELECT * INTO employee_record FROM public.employees WHERE id = p_employee_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Employee not found: %', p_employee_id;
    END IF;
    
    -- Start from the first day of the start month
    loop_date := DATE_TRUNC('month', p_start_date)::DATE;
    
    WHILE loop_date <= p_end_date LOOP
        -- Get effective values for this date by finding the most recent increment before or on this date
        SELECT 
            COALESCE(latest_inc.salary, emp.salary),
            COALESCE(latest_inc.esop_allocation, emp.esop_allocation),
            COALESCE(latest_inc.price_per_share, emp.price_per_share, 0),
            COALESCE(latest_inc.number_of_shares, emp.number_of_shares, 0),
            emp.allocation_type
        INTO effective_salary, effective_esop, effective_price_per_share, effective_number_of_shares, employee_record.allocation_type
        FROM public.employees emp
        LEFT JOIN (
            SELECT * FROM public.employees_increments 
            WHERE employee_id = p_employee_id 
            AND effective_date <= loop_date
            ORDER BY effective_date DESC 
            LIMIT 1
        ) latest_inc ON true
        WHERE emp.id = p_employee_id;
        
        -- Calculate monthly ESOP based on allocation type
        -- For quarterly: total/4 allocated in Jan, Apr, Jul, Oct
        -- For monthly: total/12 allocated every month
        -- For annually: total/1 allocated in January
        -- For one-time: never allocate monthly
        monthly_esop := CASE 
            WHEN employee_record.allocation_type = 'monthly' THEN effective_esop / 12
            WHEN employee_record.allocation_type = 'quarterly' AND EXTRACT(MONTH FROM loop_date) IN (1, 4, 7, 10) THEN effective_esop / 4
            WHEN employee_record.allocation_type = 'annually' AND EXTRACT(MONTH FROM loop_date) = 1 THEN effective_esop
            ELSE 0 -- one-time allocations or non-allocation months
        END;
        
        -- If no price per share from employee data, try to get it from startup shares
        IF effective_price_per_share = 0 THEN
            SELECT price_per_share INTO effective_price_per_share
            FROM public.startup_shares ss
            JOIN public.employees emp ON emp.startup_id = ss.startup_id
            WHERE emp.id = p_employee_id
            AND ss.price_per_share > 0
            ORDER BY ss.updated_at DESC
            LIMIT 1;
        END IF;
        
        -- Calculate number of shares for this month
        IF effective_price_per_share > 0 AND monthly_esop > 0 THEN
            effective_number_of_shares := FLOOR(monthly_esop / effective_price_per_share);
        ELSE
            effective_number_of_shares := 0;
        END IF;
        
        -- Insert ledger entry (ignore if already exists)
        INSERT INTO public.employee_ledger (
            employee_id,
            ledger_date,
            salary,
            esop_allocated,
            price_per_share,
            number_of_shares
        ) VALUES (
            p_employee_id,
            loop_date,
            effective_salary,
            monthly_esop,
            effective_price_per_share,
            effective_number_of_shares
        )
        ON CONFLICT (employee_id, ledger_date) DO UPDATE SET
            salary = EXCLUDED.salary,
            esop_allocated = EXCLUDED.esop_allocated,
            price_per_share = EXCLUDED.price_per_share,
            number_of_shares = EXCLUDED.number_of_shares,
            updated_at = NOW();
        
        entry_count := entry_count + 1;
        
        -- Move to next month
        loop_date := loop_date + INTERVAL '1 month';
    END LOOP;
    
    RETURN entry_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to generate ledger for all employees of a startup
CREATE OR REPLACE FUNCTION generate_startup_employee_ledger(
    p_startup_id INTEGER,
    p_start_date DATE,
    p_end_date DATE
) RETURNS INTEGER AS $$
DECLARE
    employee_record RECORD;
    total_entries INTEGER := 0;
BEGIN
    -- Get all employees for the startup
    FOR employee_record IN 
        SELECT id FROM public.employees WHERE startup_id = p_startup_id
    LOOP
        total_entries := total_entries + generate_employee_ledger_entries(
            employee_record.id,
            p_start_date,
            p_end_date
        );
    END LOOP;
    
    RETURN total_entries;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
