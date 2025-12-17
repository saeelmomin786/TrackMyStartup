-- =====================================================
-- FIX RLS POLICIES FOR A SINGLE TABLE (SIMPLE VERSION)
-- =====================================================
-- INSTRUCTIONS:
-- 1. Find the line that says: target_table TEXT := 'YOUR_TABLE_NAME';
-- 2. Replace 'YOUR_TABLE_NAME' with your actual table name
-- 3. Run the script
-- 4. Test the table functionality
-- 5. Move to next table
-- =====================================================

DO $$
DECLARE
    -- ⬇️ CHANGE THIS LINE - Replace 'YOUR_TABLE_NAME' with your table name ⬇️
    target_table TEXT := 'YOUR_TABLE_NAME';
    -- ⬆️ CHANGE THIS LINE ⬆️
    
    col_rec RECORD;
    has_fk_to_users BOOLEAN;
    is_text_type BOOLEAN;
    user_col_name TEXT;
    user_col_type TEXT;
BEGIN
    -- Validate table exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename = target_table
    ) THEN
        RAISE EXCEPTION 'Table % does not exist. Did you forget to change YOUR_TABLE_NAME?', target_table;
    END IF;
    
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Fixing RLS policies for table: %', target_table;
    RAISE NOTICE '========================================';
    
    -- Find the user reference column
    SELECT 
        c.column_name,
        c.data_type
    INTO user_col_name, user_col_type
    FROM information_schema.columns c
    WHERE c.table_schema = 'public'
    AND c.table_name = target_table
    AND (
        c.column_name LIKE '%user_id%'
        OR c.column_name LIKE '%investor_id%'
        OR c.column_name LIKE '%advisor_id%'
        OR c.column_name LIKE '%mentor_id%'
        OR c.column_name LIKE '%requester_id%'
    )
    ORDER BY 
        CASE 
            WHEN c.column_name = 'user_id' THEN 1
            WHEN c.column_name LIKE '%_id' THEN 2
            ELSE 3
        END
    LIMIT 1;
    
    IF user_col_name IS NULL THEN
        RAISE NOTICE '⚠️ No user reference column found in table %', target_table;
        RAISE NOTICE 'This table might not need user-based RLS policies';
        RETURN;
    END IF;
    
    RAISE NOTICE '✅ Found column: % (type: %)', user_col_name, user_col_type;
    
    -- Check if column is text/varchar type
    is_text_type := user_col_type LIKE 'character varying%' 
        OR user_col_type LIKE 'varchar%'
        OR user_col_type IN ('text', 'char', 'character');
    
    RAISE NOTICE '   Column type: % (is_text: %)', user_col_type, is_text_type;
    
    -- Check if this column has FK to users(id)
    SELECT EXISTS (
        SELECT 1 FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu 
            ON tc.constraint_name = kcu.constraint_name
            AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage ccu 
            ON ccu.constraint_name = tc.constraint_name
            AND ccu.table_schema = tc.table_schema
        WHERE tc.table_name = target_table
        AND kcu.column_name = user_col_name
        AND ccu.table_name = 'users'
        AND ccu.column_name = 'id'
        AND tc.constraint_type = 'FOREIGN KEY'
    ) INTO has_fk_to_users;
    
    RAISE NOTICE '   FK to users(id): %', has_fk_to_users;
    
    -- Drop existing policies
    RAISE NOTICE 'Dropping existing policies...';
    EXECUTE format('
        DROP POLICY IF EXISTS "Users can insert %I" ON public.%I;
        DROP POLICY IF EXISTS "Users can view %I" ON public.%I;
        DROP POLICY IF EXISTS "Users can update %I" ON public.%I;
        DROP POLICY IF EXISTS "Users can delete %I" ON public.%I;
    ', target_table, target_table,
       target_table, target_table,
       target_table, target_table,
       target_table, target_table);
    
    -- Create policies based on FK constraint and column type
    IF has_fk_to_users THEN
        -- FK to users(id) - MUST use auth.uid()
        RAISE NOTICE 'Creating policies: FK to users(id) - using auth.uid()...';
        
        IF is_text_type THEN
            -- Text/VARCHAR column - cast auth.uid() to text
            EXECUTE format('
                CREATE POLICY "Users can insert %I" 
                ON public.%I FOR INSERT TO authenticated
                WITH CHECK (%I = auth.uid()::text);
            ', target_table, target_table, user_col_name);
            
            EXECUTE format('
                CREATE POLICY "Users can view %I" 
                ON public.%I FOR SELECT TO authenticated
                USING (%I = auth.uid()::text);
            ', target_table, target_table, user_col_name);
            
            EXECUTE format('
                CREATE POLICY "Users can update %I" 
                ON public.%I FOR UPDATE TO authenticated
                USING (%I = auth.uid()::text)
                WITH CHECK (%I = auth.uid()::text);
            ', target_table, target_table, user_col_name, user_col_name);
            
            EXECUTE format('
                CREATE POLICY "Users can delete %I" 
                ON public.%I FOR DELETE TO authenticated
                USING (%I = auth.uid()::text);
            ', target_table, target_table, user_col_name);
            
            RAISE NOTICE '✅ Created policies (TEXT type, FK to users.id)';
        ELSE
            -- UUID column - use auth.uid() directly
            EXECUTE format('
                CREATE POLICY "Users can insert %I" 
                ON public.%I FOR INSERT TO authenticated
                WITH CHECK (%I = auth.uid());
            ', target_table, target_table, user_col_name);
            
            EXECUTE format('
                CREATE POLICY "Users can view %I" 
                ON public.%I FOR SELECT TO authenticated
                USING (%I = auth.uid());
            ', target_table, target_table, user_col_name);
            
            EXECUTE format('
                CREATE POLICY "Users can update %I" 
                ON public.%I FOR UPDATE TO authenticated
                USING (%I = auth.uid())
                WITH CHECK (%I = auth.uid());
            ', target_table, target_table, user_col_name, user_col_name);
            
            EXECUTE format('
                CREATE POLICY "Users can delete %I" 
                ON public.%I FOR DELETE TO authenticated
                USING (%I = auth.uid());
            ', target_table, target_table, user_col_name);
            
            RAISE NOTICE '✅ Created policies (UUID type, FK to users.id)';
        END IF;
    ELSE
        -- No FK constraint - support both auth.uid() and profile IDs
        RAISE NOTICE 'Creating policies: No FK - supporting both auth.uid() and profile IDs...';
        
        IF is_text_type THEN
            -- Text/VARCHAR column
            EXECUTE format('
                CREATE POLICY "Users can insert %I" 
                ON public.%I FOR INSERT TO authenticated
                WITH CHECK (
                    %I = auth.uid()::text
                    OR EXISTS (
                        SELECT 1 FROM public.user_profiles 
                        WHERE auth_user_id = auth.uid() 
                        AND %I = id::text
                    )
                );
            ', target_table, target_table, user_col_name, user_col_name);
            
            EXECUTE format('
                CREATE POLICY "Users can view %I" 
                ON public.%I FOR SELECT TO authenticated
                USING (
                    %I = auth.uid()::text
                    OR EXISTS (
                        SELECT 1 FROM public.user_profiles 
                        WHERE auth_user_id = auth.uid() 
                        AND %I = id::text
                    )
                );
            ', target_table, target_table, user_col_name, user_col_name);
            
            EXECUTE format('
                CREATE POLICY "Users can update %I" 
                ON public.%I FOR UPDATE TO authenticated
                USING (
                    %I = auth.uid()::text
                    OR EXISTS (
                        SELECT 1 FROM public.user_profiles 
                        WHERE auth_user_id = auth.uid() 
                        AND %I = id::text
                    )
                )
                WITH CHECK (
                    %I = auth.uid()::text
                    OR EXISTS (
                        SELECT 1 FROM public.user_profiles 
                        WHERE auth_user_id = auth.uid() 
                        AND %I = id::text
                    )
                );
            ', target_table, target_table, user_col_name, user_col_name, user_col_name, user_col_name);
            
            EXECUTE format('
                CREATE POLICY "Users can delete %I" 
                ON public.%I FOR DELETE TO authenticated
                USING (
                    %I = auth.uid()::text
                    OR EXISTS (
                        SELECT 1 FROM public.user_profiles 
                        WHERE auth_user_id = auth.uid() 
                        AND %I = id::text
                    )
                );
            ', target_table, target_table, user_col_name, user_col_name);
            
            RAISE NOTICE '✅ Created policies (TEXT type, no FK)';
        ELSE
            -- UUID column
            EXECUTE format('
                CREATE POLICY "Users can insert %I" 
                ON public.%I FOR INSERT TO authenticated
                WITH CHECK (
                    %I = auth.uid()
                    OR EXISTS (
                        SELECT 1 FROM public.user_profiles 
                        WHERE auth_user_id = auth.uid() 
                        AND %I = id
                    )
                );
            ', target_table, target_table, user_col_name, user_col_name);
            
            EXECUTE format('
                CREATE POLICY "Users can view %I" 
                ON public.%I FOR SELECT TO authenticated
                USING (
                    %I = auth.uid()
                    OR EXISTS (
                        SELECT 1 FROM public.user_profiles 
                        WHERE auth_user_id = auth.uid() 
                        AND %I = id
                    )
                );
            ', target_table, target_table, user_col_name, user_col_name);
            
            EXECUTE format('
                CREATE POLICY "Users can update %I" 
                ON public.%I FOR UPDATE TO authenticated
                USING (
                    %I = auth.uid()
                    OR EXISTS (
                        SELECT 1 FROM public.user_profiles 
                        WHERE auth_user_id = auth.uid() 
                        AND %I = id
                    )
                )
                WITH CHECK (
                    %I = auth.uid()
                    OR EXISTS (
                        SELECT 1 FROM public.user_profiles 
                        WHERE auth_user_id = auth.uid() 
                        AND %I = id
                    )
                );
            ', target_table, target_table, user_col_name, user_col_name, user_col_name, user_col_name);
            
            EXECUTE format('
                CREATE POLICY "Users can delete %I" 
                ON public.%I FOR DELETE TO authenticated
                USING (
                    %I = auth.uid()
                    OR EXISTS (
                        SELECT 1 FROM public.user_profiles 
                        WHERE auth_user_id = auth.uid() 
                        AND %I = id
                    )
                );
            ', target_table, target_table, user_col_name, user_col_name);
            
            RAISE NOTICE '✅ Created policies (UUID type, no FK)';
        END IF;
    END IF;
    
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ COMPLETE: Table % fixed successfully!', target_table;
    RAISE NOTICE '   Column: %', user_col_name;
    RAISE NOTICE '   Type: %', user_col_type;
    RAISE NOTICE '   FK to users(id): %', has_fk_to_users;
    RAISE NOTICE '========================================';
END $$;

-- Show created policies for verification (run this separately after the DO block)
-- Replace 'YOUR_TABLE_NAME' with the same table name you used above
/*
SELECT 
    '✅ Policies created' as info,
    policyname,
    cmd as operation,
    CASE 
        WHEN qual IS NOT NULL THEN '✅ Has USING'
        ELSE '❌ No USING'
    END as using_clause,
    CASE 
        WHEN with_check IS NOT NULL THEN '✅ Has WITH CHECK'
        ELSE '❌ No WITH CHECK'
    END as with_check_clause
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'YOUR_TABLE_NAME'  -- Change this to your table name
ORDER BY 
    CASE cmd
        WHEN 'INSERT' THEN 1
        WHEN 'SELECT' THEN 2
        WHEN 'UPDATE' THEN 3
        WHEN 'DELETE' THEN 4
    END;
*/

