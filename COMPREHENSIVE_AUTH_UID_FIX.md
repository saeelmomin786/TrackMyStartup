# Comprehensive Fix: Replace currentUser.id with auth.uid()

## Overview

This document tracks all places where `currentUser.id` (profile ID) is used in database queries that should use `auth.uid()` instead for RLS policies to work correctly.

## Pattern to Fix

**Before:**
```typescript
// ❌ WRONG - Uses profile ID
.eq('user_id', currentUser.id)
.eq('investor_id', currentUser.id)
.eq('advisor_id', currentUser.id)
```

**After:**
```typescript
// ✅ CORRECT - Uses auth.uid()
const { data: { user: authUser } } = await supabase.auth.getUser();
const authUserId = authUser?.id || currentUser.id;
.eq('user_id', authUserId)
.eq('investor_id', authUserId)
.eq('advisor_id', authUserId)
```

## Files to Fix

### 1. Investment Advisor Dashboard (`components/InvestmentAdvisorView.tsx`)

**Found Issues:**
- Line 1328: `.eq('collaborator_user_id', currentUser.id)` - Collaboration requests
- ✅ Line 1372: Already fixed (uses auth.uid())
- ✅ Line 3284: Already fixed (uses auth.uid())
- ✅ Line 3473: Already fixed (uses auth.uid())

**Status:** ⚠️ 1 remaining issue

---

### 2. Investor Dashboard (`components/InvestorView.tsx`)

**Found Issues:**
- Line 369: `.eq('investor_id', currentUser.id)` - Investment advisor recommendations
- Line 725: `.eq('listed_by_user_id', currentUser.id)` - Co-investment opportunities
- Line 733: `.eq('listed_by_user_id', currentUser.id)` - Co-investment opportunities
- Line 821: `.eq('listed_by_user_id', currentUser.id)` - Co-investment opportunities
- Line 1055: `.eq('listed_by_user_id', currentUser.id)` - Co-investment opportunities
- Line 1218: `.eq('user_id', currentUser.id)` - Due diligence requests
- Line 1327: `.eq('user_id', currentUser.id)` - Due diligence requests
- Line 1530: `.eq('user_id', currentUser.id)` - Due diligence requests
- Line 1544: `.eq('user_id', currentUser.id)` - Due diligence requests

**Status:** ⚠️ 9 issues to fix

---

### 3. Mentor Components

**Found Issues:**
- `components/mentor/MentorProfileForm.tsx`:
  - Line 131: `.eq('mentor_id', currentUser.id)`
  - Line 198: `.eq('mentor_id', currentUser.id)`
  - Line 246: `.eq('mentor_id', currentUser.id)`
  - Line 299: `.eq('user_id', currentUser.id)`
- `components/MentorView.tsx`:
  - Line 172: `.eq('requester_id', currentUser.id!)`

**Status:** ⚠️ 5 issues to fix

---

### 4. Profile Forms

**Found Issues:**
- `components/EditProfileModal.tsx`:
  - Line 386: `.eq('user_id', currentUser.id)`
- `components/investment-advisor/InvestmentAdvisorProfileForm.tsx`:
  - Line 253: `.eq('user_id', currentUser.id)`
  - Line 265: `.eq('id', currentUser.id)`
  - Line 399: `.eq('id', currentUser.id)`
  - Line 434: `.eq('id', currentUser.id)`
  - Line 478: `.eq('id', currentUser.id)`
- `components/investor/InvestorProfileForm.tsx`:
  - Line 235: `.eq('user_id', currentUser.id)`
- `components/PublicInvestorPage.tsx`:
  - Line 301: `.eq('user_id', currentUser.id)`

**Status:** ⚠️ 8 issues to fix

---

## Total Issues Found

- **Investment Advisor Dashboard:** 1 issue
- **Investor Dashboard:** 9 issues
- **Mentor Components:** 5 issues
- **Profile Forms:** 8 issues
- **Total:** 23 issues

## Fix Strategy

1. ✅ Fix Investment Advisor Dashboard (1 issue)
2. ⚠️ Fix Investor Dashboard (9 issues)
3. ⚠️ Fix Mentor Components (5 issues)
4. ⚠️ Fix Profile Forms (8 issues)

## Next Steps

I'll fix each file systematically, starting with the most critical (dashboards), then moving to forms.





