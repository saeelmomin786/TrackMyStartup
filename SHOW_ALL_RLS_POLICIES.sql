-- =====================================================
-- SHOW ALL RLS POLICIES - NO FILTERING
-- =====================================================

SELECT 
  schemaname,
  tablename,
  policyname,
  qual
FROM pg_policies
WHERE tablename IN ('billing_cycles', 'payment_transactions', 'user_subscriptions')
ORDER BY tablename, policyname;
