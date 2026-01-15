-- =====================================================
-- SIMPLEST MIGRATION: One Function Call
-- =====================================================
-- Just run this in Supabase SQL Editor
-- Uses the existing recalculate_all_user_storage() function
-- =====================================================

-- This function calculates and updates storage for ALL users
SELECT * FROM recalculate_all_user_storage();

-- =====================================================
-- That's it! This updates storage_used_mb for all users
-- =====================================================
