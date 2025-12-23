-- =====================================================
-- RUN ALL 4 VIEW MIGRATIONS
-- =====================================================
-- This script runs all 4 view migrations in sequence
-- All views are migrated to use user_profiles instead of users

-- 1. Investment Advisor Dashboard Metrics View
\i MIGRATE_INVESTMENT_ADVISOR_DASHBOARD_METRICS_VIEW.sql

-- 2. User Center Info View
\i MIGRATE_USER_CENTER_INFO_VIEW.sql

-- 3. User Startup Info View
\i MIGRATE_USER_STARTUP_INFO_VIEW.sql

-- 4. Incubation Opportunities View
\i MIGRATE_V_INCUBATION_OPPORTUNITIES_VIEW.sql

-- Note: The \i command may not work in Supabase SQL editor
-- Instead, run each script separately:
-- 1. MIGRATE_INVESTMENT_ADVISOR_DASHBOARD_METRICS_VIEW.sql
-- 2. MIGRATE_USER_CENTER_INFO_VIEW.sql
-- 3. MIGRATE_USER_STARTUP_INFO_VIEW.sql
-- 4. MIGRATE_V_INCUBATION_OPPORTUNITIES_VIEW.sql











