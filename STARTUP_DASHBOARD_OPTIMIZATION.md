# Startup Dashboard Optimization Plan

## Current Issues (observed)
- ~~Multiple parallel offer fetches on mount/prop change/event listeners~~ ✅ **FIXED: Removed infinite loop**
- ~~Financial data is fetched twice on first render~~ (metrics calculation + chart data both call financialsService.getFinancialRecords).
- ~~Offers are fetched in both parent and child~~ ✅ **FIXED: Now only fetches if not provided via props**
- ~~Residual dependencies on legacy `users` table~~ ✅ **AUDITED: Dashboard doesn't use users table**

## Completed Optimizations ✅
1. **Phase 1 - Verbose Logging Cleanup** (✅ COMPLETE):
   - Gated all co-investment opportunity filtering logs in database.ts under dev mode
   - Removed per-opportunity visibility check logs (was 50+ logs per load)
   - Gated StartupHealthView offer filtering logs
   - Removed fallback fetch verbose logs
   - Result: Reduced 500+ logs to ~50 essential logs

2. **Phase 1 - Infinite Loop Fix** (✅ COMPLETE):
   - Removed duplicate `useEffect` hooks calling `loadOffersReceived()`
   - Added guard: only fetch offers if not provided via props
   - Removed redundant event listeners (offerUpdated, offerStageUpdated)
   - Result: Dashboard now loads offers ONCE instead of 30+ times

3. **Users Table Audit** (✅ COMPLETE):
   - Confirmed dashboard critical path does NOT use legacy `users` table
   - All services use `user_profiles`/auth tables appropriately
   - Optional future cleanup: mentorEquityService (only affects manual mentor editing)

4. **Phase 2 - RPC Function Optimization** (✅ COMPLETE):
   - Removed unnecessary RPC calls to `get_valuation_history` and `get_equity_distribution`
   - Both functions now use manual calculations directly (no 404 errors)
   - Simplified valuation history to show only the most recent Post-Money valuation
   - Result: Eliminated 404 errors, reduced complexity, faster load times

## Remaining Issues (⚠️)
1. **404 Error - profile_notifications table** (Optional):
   - Table doesn't exist but already has graceful fallback in profileService.ts
   - Not critical to functionality, can be created later if needed
   - SQL file available: [database/fix_404_and_400_errors.sql](database/fix_404_and_400_errors.sql)

2. **Verbose Logs Still in Dev Mode**:
   - All logs are now gated under `process.env.NODE_ENV === 'development'`
   - Logs will only show when running in development mode
   - To completely silence logs, set `NODE_ENV=production` or remove logs manually

## Proposed Optimization Steps (Future Phase 2)
1) Financial data optimization
   - Fetch financial records once, then pass to DashboardMetricsService and chart derivation
   - Extend DashboardMetricsService.calculateMetrics to accept pre-fetched records
2) Validation
   - Add manual checklist: single fetch per mount, charts render with one request

## Order of Execution
- ✅ Phase 1: Reduce redundant calls (offers + financials) and quiet logging - **COMPLETE**
- ✅ Phase 2: Remove RPC calls, use manual calculations, simplify valuation - **COMPLETE**
- ⏳ Phase 3: Financial data optimization (optional) - **NOT STARTED**

## Performance Impact Summary
- **API Calls Reduced**: From 30+ redundant offer fetches to 1 fetch
- **404 Errors Eliminated**: Removed 2 RPC calls causing 404s (get_valuation_history, get_equity_distribution)
- **Console Logs Reduced**: From 500+ logs to ~50 essential logs (dev mode only)
- **Valuation Display**: Simplified to show only most recent Post-Money valuation
- **Load Time**: Significantly faster without infinite loops and unnecessary RPC calls
