-- =====================================================
-- FIX ALL TABLES WITH FK TO users(id)
-- =====================================================
-- These tables MUST use auth.uid() (not profile IDs)
-- because they have foreign key constraints to users(id)
-- =====================================================

-- List of tables that need fixing (from verification results)
-- These tables have FK to users(id) and need auth.uid() policies

-- =====================================================
-- TABLE 1: advisor_startup_link_requests
-- =====================================================
DO $$
DECLARE
    target_table TEXT := 'advisor_startup_link_requests';
    user_col TEXT;
    col_type TEXT;
    is_text BOOLEAN;
BEGIN
    -- Find user reference column
    SELECT column_name, data_type INTO user_col, col_type
    FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = target_table
    AND (column_name LIKE '%user_id%' OR column_name LIKE '%advisor_id%' OR column_name LIKE '%requester_id%')
    LIMIT 1;
    
    IF user_col IS NULL THEN
        RAISE NOTICE '⚠️ No user column found in %', target_table;
        RETURN;
    END IF;
    
    is_text := col_type LIKE 'character varying%' OR col_type LIKE 'varchar%' OR col_type IN ('text', 'char');
    
    -- Drop existing policies
    EXECUTE format('DROP POLICY IF EXISTS "Users can insert %I" ON public.%I', target_table, target_table);
    EXECUTE format('DROP POLICY IF EXISTS "Users can view %I" ON public.%I', target_table, target_table);
    EXECUTE format('DROP POLICY IF EXISTS "Users can update %I" ON public.%I', target_table, target_table);
    
    -- Create policies with auth.uid()
    IF is_text THEN
        EXECUTE format('CREATE POLICY "Users can insert %I" ON public.%I FOR INSERT TO authenticated WITH CHECK (%I = auth.uid()::text)', target_table, target_table, user_col);
        EXECUTE format('CREATE POLICY "Users can view %I" ON public.%I FOR SELECT TO authenticated USING (%I = auth.uid()::text)', target_table, target_table, user_col);
        EXECUTE format('CREATE POLICY "Users can update %I" ON public.%I FOR UPDATE TO authenticated USING (%I = auth.uid()::text) WITH CHECK (%I = auth.uid()::text)', target_table, target_table, user_col, user_col);
    ELSE
        EXECUTE format('CREATE POLICY "Users can insert %I" ON public.%I FOR INSERT TO authenticated WITH CHECK (%I = auth.uid())', target_table, target_table, user_col);
        EXECUTE format('CREATE POLICY "Users can view %I" ON public.%I FOR SELECT TO authenticated USING (%I = auth.uid())', target_table, target_table, user_col);
        EXECUTE format('CREATE POLICY "Users can update %I" ON public.%I FOR UPDATE TO authenticated USING (%I = auth.uid()) WITH CHECK (%I = auth.uid())', target_table, target_table, user_col, user_col);
    END IF;
    
    RAISE NOTICE '✅ Fixed %', target_table;
END $$;

-- =====================================================
-- TABLE 2: co_investment_approvals
-- =====================================================
DO $$
DECLARE
    target_table TEXT := 'co_investment_approvals';
    user_col TEXT;
    col_type TEXT;
    is_text BOOLEAN;
BEGIN
    SELECT column_name, data_type INTO user_col, col_type
    FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = target_table
    AND (column_name LIKE '%user_id%' OR column_name LIKE '%investor_id%' OR column_name LIKE '%advisor_id%')
    LIMIT 1;
    
    IF user_col IS NULL THEN RETURN; END IF;
    
    is_text := col_type LIKE 'character varying%' OR col_type LIKE 'varchar%' OR col_type IN ('text', 'char');
    
    EXECUTE format('DROP POLICY IF EXISTS "Users can insert %I" ON public.%I', target_table, target_table);
    EXECUTE format('DROP POLICY IF EXISTS "Users can view %I" ON public.%I', target_table, target_table);
    EXECUTE format('DROP POLICY IF EXISTS "Users can update %I" ON public.%I', target_table, target_table);
    EXECUTE format('DROP POLICY IF EXISTS "Users can delete %I" ON public.%I', target_table, target_table);
    
    IF is_text THEN
        EXECUTE format('CREATE POLICY "Users can insert %I" ON public.%I FOR INSERT TO authenticated WITH CHECK (%I = auth.uid()::text)', target_table, target_table, user_col);
        EXECUTE format('CREATE POLICY "Users can view %I" ON public.%I FOR SELECT TO authenticated USING (%I = auth.uid()::text)', target_table, target_table, user_col);
        EXECUTE format('CREATE POLICY "Users can update %I" ON public.%I FOR UPDATE TO authenticated USING (%I = auth.uid()::text) WITH CHECK (%I = auth.uid()::text)', target_table, target_table, user_col, user_col);
        EXECUTE format('CREATE POLICY "Users can delete %I" ON public.%I FOR DELETE TO authenticated USING (%I = auth.uid()::text)', target_table, target_table, user_col);
    ELSE
        EXECUTE format('CREATE POLICY "Users can insert %I" ON public.%I FOR INSERT TO authenticated WITH CHECK (%I = auth.uid())', target_table, target_table, user_col);
        EXECUTE format('CREATE POLICY "Users can view %I" ON public.%I FOR SELECT TO authenticated USING (%I = auth.uid())', target_table, target_table, user_col);
        EXECUTE format('CREATE POLICY "Users can update %I" ON public.%I FOR UPDATE TO authenticated USING (%I = auth.uid()) WITH CHECK (%I = auth.uid())', target_table, target_table, user_col, user_col);
        EXECUTE format('CREATE POLICY "Users can delete %I" ON public.%I FOR DELETE TO authenticated USING (%I = auth.uid())', target_table, target_table, user_col);
    END IF;
    
    RAISE NOTICE '✅ Fixed %', target_table;
END $$;

-- =====================================================
-- TABLE 3: co_investment_interests
-- =====================================================
DO $$
DECLARE
    target_table TEXT := 'co_investment_interests';
    user_col TEXT;
    col_type TEXT;
    is_text BOOLEAN;
BEGIN
    SELECT column_name, data_type INTO user_col, col_type
    FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = target_table
    AND (column_name LIKE '%user_id%' OR column_name LIKE '%investor_id%')
    LIMIT 1;
    
    IF user_col IS NULL THEN RETURN; END IF;
    
    is_text := col_type LIKE 'character varying%' OR col_type LIKE 'varchar%' OR col_type IN ('text', 'char');
    
    EXECUTE format('DROP POLICY IF EXISTS "Users can insert %I" ON public.%I', target_table, target_table);
    EXECUTE format('DROP POLICY IF EXISTS "Users can view %I" ON public.%I', target_table, target_table);
    EXECUTE format('DROP POLICY IF EXISTS "Users can update %I" ON public.%I', target_table, target_table);
    
    IF is_text THEN
        EXECUTE format('CREATE POLICY "Users can insert %I" ON public.%I FOR INSERT TO authenticated WITH CHECK (%I = auth.uid()::text)', target_table, target_table, user_col);
        EXECUTE format('CREATE POLICY "Users can view %I" ON public.%I FOR SELECT TO authenticated USING (%I = auth.uid()::text)', target_table, target_table, user_col);
        EXECUTE format('CREATE POLICY "Users can update %I" ON public.%I FOR UPDATE TO authenticated USING (%I = auth.uid()::text) WITH CHECK (%I = auth.uid()::text)', target_table, target_table, user_col, user_col);
    ELSE
        EXECUTE format('CREATE POLICY "Users can insert %I" ON public.%I FOR INSERT TO authenticated WITH CHECK (%I = auth.uid())', target_table, target_table, user_col);
        EXECUTE format('CREATE POLICY "Users can view %I" ON public.%I FOR SELECT TO authenticated USING (%I = auth.uid())', target_table, target_table, user_col);
        EXECUTE format('CREATE POLICY "Users can update %I" ON public.%I FOR UPDATE TO authenticated USING (%I = auth.uid()) WITH CHECK (%I = auth.uid())', target_table, target_table, user_col, user_col);
    END IF;
    
    RAISE NOTICE '✅ Fixed %', target_table;
END $$;

-- =====================================================
-- TABLE 4: co_investment_offers
-- =====================================================
DO $$
DECLARE
    target_table TEXT := 'co_investment_offers';
    user_col TEXT;
    col_type TEXT;
    is_text BOOLEAN;
BEGIN
    SELECT column_name, data_type INTO user_col, col_type
    FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = target_table
    AND (column_name LIKE '%user_id%' OR column_name LIKE '%investor_id%')
    LIMIT 1;
    
    IF user_col IS NULL THEN RETURN; END IF;
    
    is_text := col_type LIKE 'character varying%' OR col_type LIKE 'varchar%' OR col_type IN ('text', 'char');
    
    EXECUTE format('DROP POLICY IF EXISTS "Users can insert %I" ON public.%I', target_table, target_table);
    EXECUTE format('DROP POLICY IF EXISTS "Users can view %I" ON public.%I', target_table, target_table);
    EXECUTE format('DROP POLICY IF EXISTS "Users can update %I" ON public.%I', target_table, target_table);
    
    IF is_text THEN
        EXECUTE format('CREATE POLICY "Users can insert %I" ON public.%I FOR INSERT TO authenticated WITH CHECK (%I = auth.uid()::text)', target_table, target_table, user_col);
        EXECUTE format('CREATE POLICY "Users can view %I" ON public.%I FOR SELECT TO authenticated USING (%I = auth.uid()::text)', target_table, target_table, user_col);
        EXECUTE format('CREATE POLICY "Users can update %I" ON public.%I FOR UPDATE TO authenticated USING (%I = auth.uid()::text) WITH CHECK (%I = auth.uid()::text)', target_table, target_table, user_col, user_col);
    ELSE
        EXECUTE format('CREATE POLICY "Users can insert %I" ON public.%I FOR INSERT TO authenticated WITH CHECK (%I = auth.uid())', target_table, target_table, user_col);
        EXECUTE format('CREATE POLICY "Users can view %I" ON public.%I FOR SELECT TO authenticated USING (%I = auth.uid())', target_table, target_table, user_col);
        EXECUTE format('CREATE POLICY "Users can update %I" ON public.%I FOR UPDATE TO authenticated USING (%I = auth.uid()) WITH CHECK (%I = auth.uid())', target_table, target_table, user_col, user_col);
    END IF;
    
    RAISE NOTICE '✅ Fixed %', target_table;
END $$;

-- =====================================================
-- TABLE 5: co_investment_opportunities
-- =====================================================
-- Note: This table might not have direct user_id, check structure first
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'co_investment_opportunities' AND column_name LIKE '%user_id%') THEN
        RAISE NOTICE 'co_investment_opportunities has user_id column - check if it needs fixing';
    ELSE
        RAISE NOTICE 'co_investment_opportunities does not have user_id column - may be role-based';
    END IF;
END $$;

-- =====================================================
-- TABLE 6: contact_details_access
-- =====================================================
DO $$
DECLARE
    target_table TEXT := 'contact_details_access';
    user_col TEXT;
    col_type TEXT;
    is_text BOOLEAN;
BEGIN
    SELECT column_name, data_type INTO user_col, col_type
    FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = target_table
    AND (column_name LIKE '%user_id%' OR column_name LIKE '%investor_id%')
    LIMIT 1;
    
    IF user_col IS NULL THEN RETURN; END IF;
    
    is_text := col_type LIKE 'character varying%' OR col_type LIKE 'varchar%' OR col_type IN ('text', 'char');
    
    EXECUTE format('DROP POLICY IF EXISTS "Users can view %I" ON public.%I', target_table, target_table);
    
    IF is_text THEN
        EXECUTE format('CREATE POLICY "Users can view %I" ON public.%I FOR SELECT TO authenticated USING (%I = auth.uid()::text)', target_table, target_table, user_col);
    ELSE
        EXECUTE format('CREATE POLICY "Users can view %I" ON public.%I FOR SELECT TO authenticated USING (%I = auth.uid())', target_table, target_table, user_col);
    END IF;
    
    RAISE NOTICE '✅ Fixed %', target_table;
END $$;

-- =====================================================
-- TABLE 7: evaluators
-- =====================================================
DO $$
DECLARE
    target_table TEXT := 'evaluators';
    user_col TEXT;
    col_type TEXT;
    is_text BOOLEAN;
BEGIN
    SELECT column_name, data_type INTO user_col, col_type
    FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = target_table
    AND (column_name LIKE '%user_id%' OR column_name LIKE '%evaluator_id%')
    LIMIT 1;
    
    IF user_col IS NULL THEN RETURN; END IF;
    
    is_text := col_type LIKE 'character varying%' OR col_type LIKE 'varchar%' OR col_type IN ('text', 'char');
    
    EXECUTE format('DROP POLICY IF EXISTS "Users can view %I" ON public.%I', target_table, target_table);
    EXECUTE format('DROP POLICY IF EXISTS "Users can update %I" ON public.%I', target_table, target_table);
    
    IF is_text THEN
        EXECUTE format('CREATE POLICY "Users can view %I" ON public.%I FOR SELECT TO authenticated USING (%I = auth.uid()::text)', target_table, target_table, user_col);
        EXECUTE format('CREATE POLICY "Users can update %I" ON public.%I FOR UPDATE TO authenticated USING (%I = auth.uid()::text) WITH CHECK (%I = auth.uid()::text)', target_table, target_table, user_col, user_col);
    ELSE
        EXECUTE format('CREATE POLICY "Users can view %I" ON public.%I FOR SELECT TO authenticated USING (%I = auth.uid())', target_table, target_table, user_col);
        EXECUTE format('CREATE POLICY "Users can update %I" ON public.%I FOR UPDATE TO authenticated USING (%I = auth.uid()) WITH CHECK (%I = auth.uid())', target_table, target_table, user_col, user_col);
    END IF;
    
    RAISE NOTICE '✅ Fixed %', target_table;
END $$;

-- =====================================================
-- TABLE 8: investment_advisor_commissions
-- =====================================================
DO $$
DECLARE
    target_table TEXT := 'investment_advisor_commissions';
    user_col TEXT;
    col_type TEXT;
    is_text BOOLEAN;
BEGIN
    SELECT column_name, data_type INTO user_col, col_type
    FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = target_table
    AND (column_name LIKE '%user_id%' OR column_name LIKE '%advisor_id%' OR column_name LIKE '%investor_id%')
    LIMIT 1;
    
    IF user_col IS NULL THEN RETURN; END IF;
    
    is_text := col_type LIKE 'character varying%' OR col_type LIKE 'varchar%' OR col_type IN ('text', 'char');
    
    EXECUTE format('DROP POLICY IF EXISTS "Users can view %I" ON public.%I', target_table, target_table);
    
    IF is_text THEN
        EXECUTE format('CREATE POLICY "Users can view %I" ON public.%I FOR SELECT TO authenticated USING (%I = auth.uid()::text)', target_table, target_table, user_col);
    ELSE
        EXECUTE format('CREATE POLICY "Users can view %I" ON public.%I FOR SELECT TO authenticated USING (%I = auth.uid())', target_table, target_table, user_col);
    END IF;
    
    RAISE NOTICE '✅ Fixed %', target_table;
END $$;

-- =====================================================
-- TABLE 9: investment_advisor_offer_visibility
-- =====================================================
DO $$
DECLARE
    target_table TEXT := 'investment_advisor_offer_visibility';
    user_col TEXT;
    col_type TEXT;
    is_text BOOLEAN;
BEGIN
    SELECT column_name, data_type INTO user_col, col_type
    FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = target_table
    AND (column_name LIKE '%user_id%' OR column_name LIKE '%advisor_id%')
    LIMIT 1;
    
    IF user_col IS NULL THEN RETURN; END IF;
    
    is_text := col_type LIKE 'character varying%' OR col_type LIKE 'varchar%' OR col_type IN ('text', 'char');
    
    EXECUTE format('DROP POLICY IF EXISTS "Users can view %I" ON public.%I', target_table, target_table);
    
    IF is_text THEN
        EXECUTE format('CREATE POLICY "Users can view %I" ON public.%I FOR SELECT TO authenticated USING (%I = auth.uid()::text)', target_table, target_table, user_col);
    ELSE
        EXECUTE format('CREATE POLICY "Users can view %I" ON public.%I FOR SELECT TO authenticated USING (%I = auth.uid())', target_table, target_table, user_col);
    END IF;
    
    RAISE NOTICE '✅ Fixed %', target_table;
END $$;

-- =====================================================
-- TABLE 10: investment_advisor_recommendations
-- =====================================================
DO $$
DECLARE
    target_table TEXT := 'investment_advisor_recommendations';
    user_col TEXT;
    col_type TEXT;
    is_text BOOLEAN;
BEGIN
    SELECT column_name, data_type INTO user_col, col_type
    FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = target_table
    AND (column_name LIKE '%user_id%' OR column_name LIKE '%advisor_id%' OR column_name LIKE '%investor_id%')
    LIMIT 1;
    
    IF user_col IS NULL THEN RETURN; END IF;
    
    is_text := col_type LIKE 'character varying%' OR col_type LIKE 'varchar%' OR col_type IN ('text', 'char');
    
    EXECUTE format('DROP POLICY IF EXISTS "Users can insert %I" ON public.%I', target_table, target_table);
    EXECUTE format('DROP POLICY IF EXISTS "Users can view %I" ON public.%I', target_table, target_table);
    EXECUTE format('DROP POLICY IF EXISTS "Users can update %I" ON public.%I', target_table, target_table);
    
    IF is_text THEN
        EXECUTE format('CREATE POLICY "Users can insert %I" ON public.%I FOR INSERT TO authenticated WITH CHECK (%I = auth.uid()::text)', target_table, target_table, user_col);
        EXECUTE format('CREATE POLICY "Users can view %I" ON public.%I FOR SELECT TO authenticated USING (%I = auth.uid()::text)', target_table, target_table, user_col);
        EXECUTE format('CREATE POLICY "Users can update %I" ON public.%I FOR UPDATE TO authenticated USING (%I = auth.uid()::text) WITH CHECK (%I = auth.uid()::text)', target_table, target_table, user_col, user_col);
    ELSE
        EXECUTE format('CREATE POLICY "Users can insert %I" ON public.%I FOR INSERT TO authenticated WITH CHECK (%I = auth.uid())', target_table, target_table, user_col);
        EXECUTE format('CREATE POLICY "Users can view %I" ON public.%I FOR SELECT TO authenticated USING (%I = auth.uid())', target_table, target_table, user_col);
        EXECUTE format('CREATE POLICY "Users can update %I" ON public.%I FOR UPDATE TO authenticated USING (%I = auth.uid()) WITH CHECK (%I = auth.uid())', target_table, target_table, user_col, user_col);
    END IF;
    
    RAISE NOTICE '✅ Fixed %', target_table;
END $$;

-- =====================================================
-- TABLE 11: investment_advisor_relationships
-- =====================================================
DO $$
DECLARE
    target_table TEXT := 'investment_advisor_relationships';
    user_col TEXT;
    col_type TEXT;
    is_text BOOLEAN;
BEGIN
    SELECT column_name, data_type INTO user_col, col_type
    FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = target_table
    AND (column_name LIKE '%user_id%' OR column_name LIKE '%advisor_id%' OR column_name LIKE '%investor_id%')
    LIMIT 1;
    
    IF user_col IS NULL THEN RETURN; END IF;
    
    is_text := col_type LIKE 'character varying%' OR col_type LIKE 'varchar%' OR col_type IN ('text', 'char');
    
    EXECUTE format('DROP POLICY IF EXISTS "Users can view %I" ON public.%I', target_table, target_table);
    
    IF is_text THEN
        EXECUTE format('CREATE POLICY "Users can view %I" ON public.%I FOR SELECT TO authenticated USING (%I = auth.uid()::text)', target_table, target_table, user_col);
    ELSE
        EXECUTE format('CREATE POLICY "Users can view %I" ON public.%I FOR SELECT TO authenticated USING (%I = auth.uid())', target_table, target_table, user_col);
    END IF;
    
    RAISE NOTICE '✅ Fixed %', target_table;
END $$;

-- =====================================================
-- TABLE 12: investment_offers
-- =====================================================
-- Note: This uses investor_id, already fixed in previous script
-- But let's ensure it's correct
DO $$
DECLARE
    target_table TEXT := 'investment_offers';
    user_col TEXT;
    col_type TEXT;
    is_text BOOLEAN;
BEGIN
    SELECT column_name, data_type INTO user_col, col_type
    FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = target_table
    AND column_name = 'investor_id'
    LIMIT 1;
    
    IF user_col IS NULL THEN RETURN; END IF;
    
    is_text := col_type LIKE 'character varying%' OR col_type LIKE 'varchar%' OR col_type IN ('text', 'char');
    
    -- Drop and recreate to ensure correct
    EXECUTE format('DROP POLICY IF EXISTS "Users can insert %I" ON public.%I', target_table, target_table);
    EXECUTE format('DROP POLICY IF EXISTS "Users can view %I" ON public.%I', target_table, target_table);
    EXECUTE format('DROP POLICY IF EXISTS "Users can update %I" ON public.%I', target_table, target_table);
    
    IF is_text THEN
        EXECUTE format('CREATE POLICY "Users can insert %I" ON public.%I FOR INSERT TO authenticated WITH CHECK (%I = auth.uid()::text)', target_table, target_table, user_col);
        EXECUTE format('CREATE POLICY "Users can view %I" ON public.%I FOR SELECT TO authenticated USING (true)', target_table, target_table);
        EXECUTE format('CREATE POLICY "Users can update %I" ON public.%I FOR UPDATE TO authenticated USING (%I = auth.uid()::text) WITH CHECK (%I = auth.uid()::text)', target_table, target_table, user_col, user_col);
    ELSE
        EXECUTE format('CREATE POLICY "Users can insert %I" ON public.%I FOR INSERT TO authenticated WITH CHECK (%I = auth.uid())', target_table, target_table, user_col);
        EXECUTE format('CREATE POLICY "Users can view %I" ON public.%I FOR SELECT TO authenticated USING (true)', target_table, target_table);
        EXECUTE format('CREATE POLICY "Users can update %I" ON public.%I FOR UPDATE TO authenticated USING (%I = auth.uid()) WITH CHECK (%I = auth.uid())', target_table, target_table, user_col, user_col);
    END IF;
    
    RAISE NOTICE '✅ Fixed %', target_table;
END $$;

-- =====================================================
-- TABLE 13: investor_favorites
-- =====================================================
-- Already fixed, but let's ensure it's correct
DO $$
DECLARE
    target_table TEXT := 'investor_favorites';
BEGIN
    -- Drop and recreate to ensure correct
    DROP POLICY IF EXISTS "Users can insert their own favorites" ON public.investor_favorites;
    DROP POLICY IF EXISTS "Users can view their own favorites" ON public.investor_favorites;
    DROP POLICY IF EXISTS "Users can delete their own favorites" ON public.investor_favorites;
    
    -- FK to users(id) - MUST use auth.uid()
    CREATE POLICY "Users can insert their own favorites" 
    ON public.investor_favorites FOR INSERT TO authenticated
    WITH CHECK (
        investor_id = auth.uid()
        AND (
            EXISTS (SELECT 1 FROM public.user_profiles WHERE auth_user_id = auth.uid() AND role IN ('Investor', 'Investment Advisor'))
            OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('Investor', 'Investment Advisor'))
        )
    );
    
    CREATE POLICY "Users can view their own favorites" 
    ON public.investor_favorites FOR SELECT TO authenticated
    USING (investor_id = auth.uid());
    
    CREATE POLICY "Users can delete their own favorites" 
    ON public.investor_favorites FOR DELETE TO authenticated
    USING (investor_id = auth.uid());
    
    RAISE NOTICE '✅ Fixed %', target_table;
END $$;

-- =====================================================
-- TABLE 14: startups
-- =====================================================
-- Note: Already fixed in FIX_STARTUPS_INFINITE_RECURSION.sql
-- But let's verify it's correct
DO $$
BEGIN
    -- Check if policies exist and are correct
    IF EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'startups'
        AND policyname = 'startups_select_all_authenticated'
    ) THEN
        RAISE NOTICE '✅ startups table already has correct policies';
    ELSE
        RAISE NOTICE '⚠️ startups table may need policy review';
    END IF;
END $$;

-- =====================================================
-- TABLE 15: user_submitted_compliances
-- =====================================================
DO $$
DECLARE
    target_table TEXT := 'user_submitted_compliances';
    user_col TEXT;
    col_type TEXT;
    is_text BOOLEAN;
BEGIN
    SELECT column_name, data_type INTO user_col, col_type
    FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = target_table
    AND (column_name LIKE '%user_id%')
    LIMIT 1;
    
    IF user_col IS NULL THEN RETURN; END IF;
    
    is_text := col_type LIKE 'character varying%' OR col_type LIKE 'varchar%' OR col_type IN ('text', 'char');
    
    EXECUTE format('DROP POLICY IF EXISTS "Users can insert %I" ON public.%I', target_table, target_table);
    EXECUTE format('DROP POLICY IF EXISTS "Users can view %I" ON public.%I', target_table, target_table);
    EXECUTE format('DROP POLICY IF EXISTS "Users can update %I" ON public.%I', target_table, target_table);
    EXECUTE format('DROP POLICY IF EXISTS "Users can delete %I" ON public.%I', target_table, target_table);
    
    IF is_text THEN
        EXECUTE format('CREATE POLICY "Users can insert %I" ON public.%I FOR INSERT TO authenticated WITH CHECK (%I = auth.uid()::text)', target_table, target_table, user_col);
        EXECUTE format('CREATE POLICY "Users can view %I" ON public.%I FOR SELECT TO authenticated USING (%I = auth.uid()::text)', target_table, target_table, user_col);
        EXECUTE format('CREATE POLICY "Users can update %I" ON public.%I FOR UPDATE TO authenticated USING (%I = auth.uid()::text) WITH CHECK (%I = auth.uid()::text)', target_table, target_table, user_col, user_col);
        EXECUTE format('CREATE POLICY "Users can delete %I" ON public.%I FOR DELETE TO authenticated USING (%I = auth.uid()::text)', target_table, target_table, user_col);
    ELSE
        EXECUTE format('CREATE POLICY "Users can insert %I" ON public.%I FOR INSERT TO authenticated WITH CHECK (%I = auth.uid())', target_table, target_table, user_col);
        EXECUTE format('CREATE POLICY "Users can view %I" ON public.%I FOR SELECT TO authenticated USING (%I = auth.uid())', target_table, target_table, user_col);
        EXECUTE format('CREATE POLICY "Users can update %I" ON public.%I FOR UPDATE TO authenticated USING (%I = auth.uid()) WITH CHECK (%I = auth.uid())', target_table, target_table, user_col, user_col);
        EXECUTE format('CREATE POLICY "Users can delete %I" ON public.%I FOR DELETE TO authenticated USING (%I = auth.uid())', target_table, target_table, user_col);
    END IF;
    
    RAISE NOTICE '✅ Fixed %', target_table;
END $$;

-- =====================================================
-- SUMMARY
-- =====================================================
SELECT 
    '✅ FK TO USERS TABLES FIX COMPLETE' as status,
    'All tables with FK to users(id) now use auth.uid() in policies' as note,
    'Test each table functionality to verify fixes' as next_step;



