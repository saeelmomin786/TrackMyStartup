-- Check what columns and data are in the Intake CRM related tables

-- 1. Check intake_crm_columns structure and data
SELECT 
  table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name IN ('intake_crm_columns', 'intake_crm_status_map', 'intake_crm_attachments', 'opportunity_applications')
ORDER BY table_name, ordinal_position;

-- 2. Show actual data in intake_crm_columns
SELECT * FROM public.intake_crm_columns LIMIT 10;

-- 3. Show actual data in intake_crm_status_map
SELECT * FROM public.intake_crm_status_map LIMIT 10;

-- 4. Show actual data in opportunity_applications
SELECT * FROM public.opportunity_applications LIMIT 10;

-- 5. Check if priority column exists in intake_crm_status_map
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'intake_crm_status_map' AND column_name = 'priority';
