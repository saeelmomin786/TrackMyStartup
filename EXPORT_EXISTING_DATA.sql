-- EXPORT EXISTING DATA BEFORE MAKING CHANGES
-- Run this first to save your current data

-- 1. Export opportunity_applications data
SELECT 'EXPORTING OPPORTUNITY_APPLICATIONS DATA:' as export_info;
SELECT 
    id,
    startup_id,
    opportunity_id,
    status,
    pitch_deck_url,
    pitch_video_url,
    agreement_url,
    diligence_status,
    created_at,
    updated_at
FROM public.opportunity_applications
ORDER BY created_at DESC;

-- 2. Export incubation_opportunities data
SELECT 'EXPORTING INCUBATION_OPPORTUNITIES DATA:' as export_info;
SELECT 
    id,
    facilitator_id,
    program_name,
    description,
    deadline,
    poster_url,
    video_url,
    facilitator_code,
    created_at
FROM public.incubation_opportunities
ORDER BY created_at DESC;

-- 3. Count records to verify data exists
SELECT 'DATA COUNTS:' as count_info;
SELECT 
    'opportunity_applications' as table_name,
    COUNT(*) as record_count
FROM public.opportunity_applications
UNION ALL
SELECT 
    'incubation_opportunities' as table_name,
    COUNT(*) as record_count
FROM public.incubation_opportunities;

-- 4. Show current table structure
SELECT 'CURRENT TABLE STRUCTURE:' as structure_info;
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name IN ('opportunity_applications', 'incubation_opportunities')
    AND table_schema = 'public'
ORDER BY table_name, ordinal_position;

-- 5. Show current RLS policies
SELECT 'CURRENT RLS POLICIES:' as policies_info;
SELECT 
    tablename,
    policyname,
    cmd,
    permissive,
    roles
FROM pg_policies 
WHERE tablename IN ('opportunity_applications', 'incubation_opportunities')
    AND schemaname = 'public'
ORDER BY tablename, policyname;

-- 6. Export as INSERT statements (for manual backup)
SELECT 'INSERT STATEMENTS FOR MANUAL BACKUP:' as backup_info;

-- Generate INSERT statements for opportunity_applications
SELECT 
    'INSERT INTO public.opportunity_applications (id, startup_id, opportunity_id, status, pitch_deck_url, pitch_video_url, agreement_url, diligence_status, created_at, updated_at) VALUES (' ||
    CASE WHEN id IS NOT NULL THEN '''' || id || '''' ELSE 'NULL' END || ', ' ||
    CASE WHEN startup_id IS NOT NULL THEN startup_id::text ELSE 'NULL' END || ', ' ||
    CASE WHEN opportunity_id IS NOT NULL THEN '''' || opportunity_id || '''' ELSE 'NULL' END || ', ' ||
    CASE WHEN status IS NOT NULL THEN '''' || status || '''' ELSE 'NULL' END || ', ' ||
    CASE WHEN pitch_deck_url IS NOT NULL THEN '''' || pitch_deck_url || '''' ELSE 'NULL' END || ', ' ||
    CASE WHEN pitch_video_url IS NOT NULL THEN '''' || pitch_video_url || '''' ELSE 'NULL' END || ', ' ||
    CASE WHEN agreement_url IS NOT NULL THEN '''' || agreement_url || '''' ELSE 'NULL' END || ', ' ||
    CASE WHEN diligence_status IS NOT NULL THEN '''' || diligence_status || '''' ELSE 'NULL' END || ', ' ||
    CASE WHEN created_at IS NOT NULL THEN '''' || created_at || '''' ELSE 'NULL' END || ', ' ||
    CASE WHEN updated_at IS NOT NULL THEN '''' || updated_at || '''' ELSE 'NULL' END ||
    ');' as insert_statement
FROM public.opportunity_applications;

-- Generate INSERT statements for incubation_opportunities
SELECT 
    'INSERT INTO public.incubation_opportunities (id, facilitator_id, program_name, description, deadline, poster_url, video_url, facilitator_code, created_at) VALUES (' ||
    CASE WHEN id IS NOT NULL THEN '''' || id || '''' ELSE 'NULL' END || ', ' ||
    CASE WHEN facilitator_id IS NOT NULL THEN '''' || facilitator_id || '''' ELSE 'NULL' END || ', ' ||
    CASE WHEN program_name IS NOT NULL THEN '''' || program_name || '''' ELSE 'NULL' END || ', ' ||
    CASE WHEN description IS NOT NULL THEN '''' || description || '''' ELSE 'NULL' END || ', ' ||
    CASE WHEN deadline IS NOT NULL THEN '''' || deadline || '''' ELSE 'NULL' END || ', ' ||
    CASE WHEN poster_url IS NOT NULL THEN '''' || poster_url || '''' ELSE 'NULL' END || ', ' ||
    CASE WHEN video_url IS NOT NULL THEN '''' || video_url || '''' ELSE 'NULL' END || ', ' ||
    CASE WHEN facilitator_code IS NOT NULL THEN '''' || facilitator_code || '''' ELSE 'NULL' END || ', ' ||
    CASE WHEN created_at IS NOT NULL THEN '''' || created_at || '''' ELSE 'NULL' END ||
    ');' as insert_statement
FROM public.incubation_opportunities;

SELECT 'DATA EXPORT COMPLETE - COPY THE RESULTS ABOVE!' as export_complete;









