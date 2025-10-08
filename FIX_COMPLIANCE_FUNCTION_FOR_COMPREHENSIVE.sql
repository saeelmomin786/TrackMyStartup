-- =====================================================
-- FIX COMPLIANCE FUNCTION TO USE COMPREHENSIVE RULES
-- =====================================================
-- This script fixes the generate_compliance_tasks_for_startup function
-- to use the new compliance_rules_comprehensive table instead of the old one

-- Drop the old function
DROP FUNCTION IF EXISTS generate_compliance_tasks_for_startup(integer);

-- Create the fixed function that uses compliance_rules_comprehensive
CREATE OR REPLACE FUNCTION generate_compliance_tasks_for_startup(startup_id_param integer)
RETURNS TABLE (
  task_id text,
  entity_identifier text,
  entity_display_name text,
  year integer,
  task_name text,
  ca_required boolean,
  cs_required boolean,
  task_type text
) AS $$
DECLARE
  s_country text;
  s_company_type text;
  s_reg_date date;
  current_year integer := EXTRACT(YEAR FROM CURRENT_DATE);
  current_month integer := EXTRACT(MONTH FROM CURRENT_DATE);
  current_quarter integer := CEIL(current_month::numeric / 3);
  reg_year integer;
  rule_rec record;
  sub_rec record;
  intl_rec record;
  sub_index integer := 0;
  intl_index integer := 0;
BEGIN
  -- Parent company profile
  SELECT country_of_registration, company_type, registration_date
  INTO s_country, s_company_type, s_reg_date
  FROM startups
  WHERE id = startup_id_param;

  IF s_reg_date IS NOT NULL THEN
    reg_year := EXTRACT(YEAR FROM s_reg_date);

    -- Generate tasks for parent company using comprehensive rules
    FOR rule_rec IN
      SELECT 
        compliance_name,
        frequency,
        verification_required,
        ca_type,
        cs_type
      FROM compliance_rules_comprehensive
      WHERE country_code = s_country
        AND company_type = s_company_type
    LOOP
      -- Assign tasks by frequency: first-year only in registration year; annual each year; quarterly/monthly emit per period
      IF rule_rec.frequency = 'first-year' THEN
        year := reg_year;
        task_id := 'parent-' || reg_year || '-' || rule_rec.frequency || '-' || rule_rec.compliance_name;
        entity_identifier := 'parent';
        entity_display_name := 'Parent Company (' || s_country || ')';
        task_name := rule_rec.compliance_name;
        ca_required := (rule_rec.verification_required = 'CA' OR rule_rec.verification_required = 'both');
        cs_required := (rule_rec.verification_required = 'CS' OR rule_rec.verification_required = 'both');
        task_type := rule_rec.frequency;
        RETURN NEXT;
      ELSIF rule_rec.frequency = 'quarterly' THEN
        FOR y IN reg_year..current_year LOOP
          FOR q IN 1..4 LOOP
            -- Only show quarterly tasks for quarters that have ended
            IF y < current_year OR (y = current_year AND q < current_quarter) THEN
              year := y;
              task_id := 'parent-' || y || '-' || rule_rec.frequency || '-Q' || q || '-' || rule_rec.compliance_name;
              entity_identifier := 'parent';
              entity_display_name := 'Parent Company (' || s_country || ')';
              task_name := rule_rec.compliance_name || ' (Q' || q || ' ' || y || ')';
              ca_required := (rule_rec.verification_required = 'CA' OR rule_rec.verification_required = 'both');
              cs_required := (rule_rec.verification_required = 'CS' OR rule_rec.verification_required = 'both');
              task_type := rule_rec.frequency;
              RETURN NEXT;
            END IF;
          END LOOP;
        END LOOP;
      ELSIF rule_rec.frequency = 'monthly' THEN
        FOR y IN reg_year..current_year LOOP
          FOR m IN 1..12 LOOP
            -- Only show monthly tasks for months that have ended
            IF y < current_year OR (y = current_year AND m < current_month) THEN
              year := y;
              task_id := 'parent-' || y || '-' || rule_rec.frequency || '-M' || LPAD(m::text, 2, '0') || '-' || rule_rec.compliance_name;
              entity_identifier := 'parent';
              entity_display_name := 'Parent Company (' || s_country || ')';
              task_name := rule_rec.compliance_name || ' (M' || LPAD(m::text, 2, '0') || ' ' || y || ')';
              ca_required := (rule_rec.verification_required = 'CA' OR rule_rec.verification_required = 'both');
              cs_required := (rule_rec.verification_required = 'CS' OR rule_rec.verification_required = 'both');
              task_type := rule_rec.frequency;
              RETURN NEXT;
            END IF;
          END LOOP;
        END LOOP;
      ELSE
        FOR y IN reg_year..current_year LOOP
          year := y;
          task_id := 'parent-' || y || '-' || rule_rec.frequency || '-' || rule_rec.compliance_name;
          entity_identifier := 'parent';
          entity_display_name := 'Parent Company (' || s_country || ')';
          task_name := rule_rec.compliance_name;
          ca_required := (rule_rec.verification_required = 'CA' OR rule_rec.verification_required = 'both');
          cs_required := (rule_rec.verification_required = 'CS' OR rule_rec.verification_required = 'both');
          task_type := rule_rec.frequency;
          RETURN NEXT;
        END LOOP;
      END IF;
    END LOOP;
  END IF;

  -- Subsidiaries for this startup
  FOR sub_rec IN
    SELECT id, country, company_type, registration_date
    FROM subsidiaries
    WHERE startup_id = startup_id_param
    ORDER BY id
  LOOP
    sub_index := sub_index + 1;
    IF sub_rec.registration_date IS NULL THEN CONTINUE; END IF;

    reg_year := EXTRACT(YEAR FROM sub_rec.registration_date);

    -- Generate tasks for this subsidiary using comprehensive rules
    FOR rule_rec IN
      SELECT 
        compliance_name,
        frequency,
        verification_required,
        ca_type,
        cs_type
      FROM compliance_rules_comprehensive
      WHERE country_code = sub_rec.country
        AND company_type = sub_rec.company_type
    LOOP
      -- Assign tasks by frequency for subsidiaries
      IF rule_rec.frequency = 'first-year' THEN
        year := reg_year;
        task_id := 'sub-' || (sub_index - 1) || '-' || reg_year || '-' || rule_rec.frequency || '-' || rule_rec.compliance_name;
        entity_identifier := 'sub-' || (sub_index - 1);
        entity_display_name := 'Subsidiary ' || sub_index || ' (' || sub_rec.country || ')';
        task_name := rule_rec.compliance_name;
        ca_required := (rule_rec.verification_required = 'CA' OR rule_rec.verification_required = 'both');
        cs_required := (rule_rec.verification_required = 'CS' OR rule_rec.verification_required = 'both');
        task_type := rule_rec.frequency;
        RETURN NEXT;
      ELSIF rule_rec.frequency = 'quarterly' THEN
        FOR y IN reg_year..current_year LOOP
          FOR q IN 1..4 LOOP
            -- Only show quarterly tasks for quarters that have ended
            IF y < current_year OR (y = current_year AND q < current_quarter) THEN
              year := y;
              task_id := 'sub-' || (sub_index - 1) || '-' || y || '-' || rule_rec.frequency || '-Q' || q || '-' || rule_rec.compliance_name;
              entity_identifier := 'sub-' || (sub_index - 1);
              entity_display_name := 'Subsidiary ' || sub_index || ' (' || sub_rec.country || ')';
              task_name := rule_rec.compliance_name || ' (Q' || q || ' ' || y || ')';
              ca_required := (rule_rec.verification_required = 'CA' OR rule_rec.verification_required = 'both');
              cs_required := (rule_rec.verification_required = 'CS' OR rule_rec.verification_required = 'both');
              task_type := rule_rec.frequency;
              RETURN NEXT;
            END IF;
          END LOOP;
        END LOOP;
      ELSIF rule_rec.frequency = 'monthly' THEN
        FOR y IN reg_year..current_year LOOP
          FOR m IN 1..12 LOOP
            -- Only show monthly tasks for months that have ended
            IF y < current_year OR (y = current_year AND m < current_month) THEN
              year := y;
              task_id := 'sub-' || (sub_index - 1) || '-' || y || '-' || rule_rec.frequency || '-M' || LPAD(m::text, 2, '0') || '-' || rule_rec.compliance_name;
              entity_identifier := 'sub-' || (sub_index - 1);
              entity_display_name := 'Subsidiary ' || sub_index || ' (' || sub_rec.country || ')';
              task_name := rule_rec.compliance_name || ' (M' || LPAD(m::text, 2, '0') || ' ' || y || ')';
              ca_required := (rule_rec.verification_required = 'CA' OR rule_rec.verification_required = 'both');
              cs_required := (rule_rec.verification_required = 'CS' OR rule_rec.verification_required = 'both');
              task_type := rule_rec.frequency;
              RETURN NEXT;
            END IF;
          END LOOP;
        END LOOP;
      ELSE
        FOR y IN reg_year..current_year LOOP
          year := y;
          task_id := 'sub-' || (sub_index - 1) || '-' || y || '-' || rule_rec.frequency || '-' || rule_rec.compliance_name;
          entity_identifier := 'sub-' || (sub_index - 1);
          entity_display_name := 'Subsidiary ' || sub_index || ' (' || sub_rec.country || ')';
          task_name := rule_rec.compliance_name;
          ca_required := (rule_rec.verification_required = 'CA' OR rule_rec.verification_required = 'both');
          cs_required := (rule_rec.verification_required = 'CS' OR rule_rec.verification_required = 'both');
          task_type := rule_rec.frequency;
          RETURN NEXT;
        END LOOP;
      END IF;
    END LOOP;
  END LOOP;

  -- Note: International operations table doesn't exist in this database
  -- If you need international operations support, create the table first

  RETURN;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- TEST THE FIXED FUNCTION
-- =====================================================

-- Test the function for startup ID 41
SELECT * FROM generate_compliance_tasks_for_startup(41);

-- Test the function for startup ID 11
SELECT * FROM generate_compliance_tasks_for_startup(11);
