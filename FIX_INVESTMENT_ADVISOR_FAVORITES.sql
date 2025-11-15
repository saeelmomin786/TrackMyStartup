-- Fix Investment Advisor Favorites Persistence
-- This script updates RLS policies to allow investment advisors to save and load their own favorites

-- 1. Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Investment Advisors can insert their own favorites" ON public.investor_favorites;
DROP POLICY IF EXISTS "Investment Advisors can view their own favorites" ON public.investor_favorites;
DROP POLICY IF EXISTS "Investment Advisors can delete their own favorites" ON public.investor_favorites;

-- 2. Create RLS policy to allow Investment Advisors to insert their own favorites
CREATE POLICY "Investment Advisors can insert their own favorites" 
ON public.investor_favorites
FOR INSERT 
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid()
        AND role = 'Investment Advisor'
    )
    AND investor_id = auth.uid()
);

-- 3. Create RLS policy to allow Investment Advisors to view their own favorites
CREATE POLICY "Investment Advisors can view their own favorites" 
ON public.investor_favorites
FOR SELECT 
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid()
        AND role = 'Investment Advisor'
    )
    AND investor_id = auth.uid()
);

-- 4. Create RLS policy to allow Investment Advisors to delete their own favorites
CREATE POLICY "Investment Advisors can delete their own favorites" 
ON public.investor_favorites
FOR DELETE 
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid()
        AND role = 'Investment Advisor'
    )
    AND investor_id = auth.uid()
);

-- Note: The column name is 'investor_id' but it can be used for both investors and investment advisors
-- since both are users with UUIDs. The RLS policies check the user's role to determine permissions.

