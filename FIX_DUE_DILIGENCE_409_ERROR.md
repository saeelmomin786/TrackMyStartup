# Fix for Due Diligence 409 Error

## Problem

**Error:** `409 Conflict` when creating due diligence requests
**Console:** `dlesebbmlrewsbmqvuza.supabase.co/rest/v1/due_diligence_requests?select=*:1 Failed to load resource: the server responded with a status of 409 ()`

## Root Cause

The frontend was using `currentUser.id` (profile ID) but RLS policies expect `auth.uid()` (auth user ID).

**Before:**
```typescript
// ❌ WRONG - Uses profile ID
await paymentService.createDueDiligenceRequest(currentUser.id, startupId);
// currentUser.id = profile ID (e.g., "profile-123")
// RLS checks: user_id = auth.uid() (e.g., "abc-123")
// Mismatch → 409 Conflict or RLS blocks
```

**After:**
```typescript
// ✅ CORRECT - Uses auth.uid()
const { data: { user: authUser } } = await supabase.auth.getUser();
const authUserId = authUser?.id || currentUser.id;
await paymentService.createDueDiligenceRequest(authUserId, startupId);
// authUserId = auth.uid() (e.g., "abc-123")
// RLS checks: user_id = auth.uid() (e.g., "abc-123")
// Match → Works!
```

## Files Fixed

1. ✅ **`lib/paymentService.ts`**
   - `createDueDiligenceRequest()` - Now uses `auth.uid()`
   - `hasApprovedDueDiligence()` - Now uses `auth.uid()`
   - `createPendingDueDiligenceIfNeeded()` - Now uses `auth.uid()`

2. ✅ **`components/InvestmentAdvisorView.tsx`**
   - `handleDueDiligenceClick()` - Now uses `auth.uid()` for queries
   - `handleServiceRequestDueDiligence()` - Now uses `auth.uid()` for queries

## Why 409 Error?

The 409 Conflict error can occur when:
1. **RLS Policy Blocks:** If `user_id` doesn't match `auth.uid()`, RLS might return 409
2. **Unique Constraint:** If there's a unique constraint on `(user_id, startup_id)` and the wrong ID is used
3. **Data Type Mismatch:** If profile ID format doesn't match expected UUID format

## Solution

All due diligence functions now:
1. Get `auth.uid()` from `supabase.auth.getUser()`
2. Use `auth.uid()` instead of `currentUser.id`
3. Match what RLS policies expect

## Testing

After the fix:
1. ✅ Click "Due Diligence" button
2. ✅ Should create request successfully (no 409 error)
3. ✅ Request should appear in "Discover Pitches" section
4. ✅ Should work for all profiles (Startup, Mentor, Investor, etc.)

## Related Issues

This same pattern needs to be applied to:
- ✅ Due diligence requests (FIXED)
- ⚠️ Other services that use `currentUser.id` for RLS-protected queries



