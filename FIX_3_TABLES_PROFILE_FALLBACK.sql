-- =====================================================
-- FIX 3 TABLES WITH PROFILE ID FALLBACK
-- =====================================================
-- These tables have FK to users(id) but policies allow profile IDs
-- This violates FK constraints. Fix by removing profile ID fallback.
-- =====================================================

-- =====================================================
-- TABLE 1: investor_favorites
-- Column: investor_id (UUID, FK to users(id))
-- =====================================================
DO $$
BEGIN
    -- Drop existing policies that allow profile IDs
    DROP POLICY IF EXISTS "Investors can view their favorites" ON public.investor_favorites;
    DROP POLICY IF EXISTS "Investors can insert favorites" ON public.investor_favorites;
    DROP POLICY IF EXISTS "Investors can delete favorites" ON public.investor_favorites;
    
    -- Create strict policies (only auth.uid(), no profile ID fallback)
    CREATE POLICY "Investors can view their favorites" 
    ON public.investor_favorites 
    FOR SELECT TO authenticated 
    USING (investor_id = auth.uid());
    
    CREATE POLICY "Investors can insert favorites" 
    ON public.investor_favorites 
    FOR INSERT TO authenticated 
    WITH CHECK (investor_id = auth.uid());
    
    CREATE POLICY "Investors can delete favorites" 
    ON public.investor_favorites 
    FOR DELETE TO authenticated 
    USING (investor_id = auth.uid());
    
    RAISE NOTICE '✅ Fixed investor_favorites - removed profile ID fallback';
END $$;

-- =====================================================
-- TABLE 2: investment_offers
-- Column: investor_id (UUID, FK to users(id))
-- =====================================================
DO $$
DECLARE
    user_col TEXT := 'investor_id';
    col_type TEXT;
    is_text BOOLEAN;
    pol RECORD;
BEGIN
    -- Check if investor_id column exists and get its type
    SELECT data_type INTO col_type
    FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'investment_offers'
    AND column_name = 'investor_id'
    LIMIT 1;
    
    IF col_type IS NULL THEN
        RAISE NOTICE '⚠️ investor_id column not found in investment_offers';
        RETURN;
    END IF;
    
    is_text := col_type LIKE 'character varying%' OR col_type LIKE 'varchar%' OR col_type IN ('text', 'char');
    
    -- Drop ALL existing policies dynamically (they might have different names)
    -- This will drop policies that allow profile IDs
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'investment_offers'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.investment_offers', pol.policyname);
    END LOOP;
    
    -- Create strict policies (only auth.uid(), no profile ID fallback)
    IF is_text THEN
        EXECUTE format('CREATE POLICY "Users can view investment_offers" ON public.investment_offers FOR SELECT TO authenticated USING (%I = auth.uid()::text)', user_col);
        EXECUTE format('CREATE POLICY "Users can insert investment_offers" ON public.investment_offers FOR INSERT TO authenticated WITH CHECK (%I = auth.uid()::text)', user_col);
        EXECUTE format('CREATE POLICY "Users can update investment_offers" ON public.investment_offers FOR UPDATE TO authenticated USING (%I = auth.uid()::text) WITH CHECK (%I = auth.uid()::text)', user_col, user_col);
        EXECUTE format('CREATE POLICY "Users can delete investment_offers" ON public.investment_offers FOR DELETE TO authenticated USING (%I = auth.uid()::text)', user_col);
    ELSE
        EXECUTE format('CREATE POLICY "Users can view investment_offers" ON public.investment_offers FOR SELECT TO authenticated USING (%I = auth.uid())', user_col);
        EXECUTE format('CREATE POLICY "Users can insert investment_offers" ON public.investment_offers FOR INSERT TO authenticated WITH CHECK (%I = auth.uid())', user_col);
        EXECUTE format('CREATE POLICY "Users can update investment_offers" ON public.investment_offers FOR UPDATE TO authenticated USING (%I = auth.uid()) WITH CHECK (%I = auth.uid())', user_col, user_col);
        EXECUTE format('CREATE POLICY "Users can delete investment_offers" ON public.investment_offers FOR DELETE TO authenticated USING (%I = auth.uid())', user_col);
    END IF;
    
    RAISE NOTICE '✅ Fixed investment_offers - removed profile ID fallback';
END $$;

-- =====================================================
-- TABLE 3: co_investment_opportunities
-- Column: listed_by_user_id (UUID, FK to users(id))
-- =====================================================
DO $$
BEGIN
    -- Drop existing policies that allow profile IDs
    DROP POLICY IF EXISTS "Users can view co_investment_opportunities" ON public.co_investment_opportunities;
    DROP POLICY IF EXISTS "Users can insert co_investment_opportunities" ON public.co_investment_opportunities;
    DROP POLICY IF EXISTS "Users can update co_investment_opportunities" ON public.co_investment_opportunities;
    
    -- Create strict policies (only auth.uid(), no profile ID fallback)
    CREATE POLICY "Users can view co_investment_opportunities" 
    ON public.co_investment_opportunities 
    FOR SELECT TO authenticated 
    USING (listed_by_user_id = auth.uid());
    
    CREATE POLICY "Users can insert co_investment_opportunities" 
    ON public.co_investment_opportunities 
    FOR INSERT TO authenticated 
    WITH CHECK (listed_by_user_id = auth.uid());
    
    CREATE POLICY "Users can update co_investment_opportunities" 
    ON public.co_investment_opportunities 
    FOR UPDATE TO authenticated 
    USING (listed_by_user_id = auth.uid())
    WITH CHECK (listed_by_user_id = auth.uid());
    
    RAISE NOTICE '✅ Fixed co_investment_opportunities - removed profile ID fallback';
END $$;

-- =====================================================
-- VERIFICATION: Check that policies no longer allow profile IDs
-- =====================================================
SELECT 
    'Verification: Policies after fix' as category,
    tablename,
    policyname,
    CASE 
        WHEN qual LIKE '%user_profiles%' OR with_check LIKE '%user_profiles%' THEN '⚠️ Still allows profile IDs'
        WHEN qual LIKE '%auth.uid()%' OR with_check LIKE '%auth.uid()%' THEN '✅ Uses auth.uid() only'
        ELSE '❓ Unknown pattern'
    END as policy_status
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN (
    'investor_favorites',
    'investment_offers',
    'co_investment_opportunities'
)
ORDER BY tablename, policyname;

