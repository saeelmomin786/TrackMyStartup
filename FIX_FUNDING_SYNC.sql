-- Fix funding synchronization between investment_records and startups tables
-- This script recalculates total_funding in startups table based on actual investment records

-- Create a function to recalculate total funding for all startups
CREATE OR REPLACE FUNCTION recalculate_all_startup_funding()
RETURNS TABLE (
    startup_id INTEGER,
    old_total_funding DECIMAL(15,2),
    new_total_funding DECIMAL(15,2),
    difference DECIMAL(15,2)
) AS $$
DECLARE
    startup_record RECORD;
    calculated_funding DECIMAL(15,2);
    result_startup_id INTEGER;
    result_old_total_funding DECIMAL(15,2);
    result_new_total_funding DECIMAL(15,2);
    result_difference DECIMAL(15,2);
BEGIN
    -- Loop through all startups
    FOR startup_record IN 
        SELECT id, total_funding 
        FROM startups 
        ORDER BY id
    LOOP
        -- Calculate actual total funding from investment records
        SELECT COALESCE(SUM(amount), 0) 
        INTO calculated_funding
        FROM investment_records 
        WHERE investment_records.startup_id = startup_record.id;
        
        -- Update the startup's total funding
        UPDATE startups 
        SET total_funding = calculated_funding 
        WHERE startups.id = startup_record.id;
        
        -- Set return values
        result_startup_id := startup_record.id;
        result_old_total_funding := startup_record.total_funding;
        result_new_total_funding := calculated_funding;
        result_difference := calculated_funding - startup_record.total_funding;
        
        -- Return the comparison
        startup_id := result_startup_id;
        old_total_funding := result_old_total_funding;
        new_total_funding := result_new_total_funding;
        difference := result_difference;
        
        RETURN NEXT;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Run the recalculation and show results
SELECT * FROM recalculate_all_startup_funding();

-- Show current state after fix
SELECT 
    s.id,
    s.name,
    s.total_funding as startup_total_funding,
    COALESCE(SUM(ir.amount), 0) as calculated_from_investments,
    s.total_funding - COALESCE(SUM(ir.amount), 0) as difference
FROM startups s
LEFT JOIN investment_records ir ON s.id = ir.startup_id
GROUP BY s.id, s.name, s.total_funding
ORDER BY s.id;
