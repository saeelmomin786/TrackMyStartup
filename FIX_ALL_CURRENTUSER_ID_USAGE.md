# Fix All currentUser.id Usage - Progress Tracker

## Summary

Found **23 issues** where `currentUser.id` (profile ID) is used instead of `auth.uid()` in database queries.

## Progress

### ✅ Investment Advisor Dashboard (`components/InvestmentAdvisorView.tsx`)
- ✅ Line 1328: Collaborator recommendations - **FIXED**
- **Status:** ✅ Complete (1/1 fixed)

### ✅ Investor Dashboard (`components/InvestorView.tsx`)
- ✅ Line 369: Investment advisor recommendations - **FIXED**
- ✅ Line 725: Co-investment opportunities (loadMyCoInvestmentOpps) - **FIXED**
- ✅ Line 733: Co-investment opportunities (retry) - **FIXED**
- ✅ Line 821: Co-investment opportunities (pending offers) - **FIXED**
- ✅ Line 1055: Co-investment opportunities (after approval) - **FIXED**
- ✅ Line 1218: Due diligence requests - **FIXED**
- ✅ Line 1327: Investor profiles (load preference) - **FIXED**
- ✅ Line 1530: Investor profiles (check exists) - **FIXED**
- ✅ Line 1544: Investor profiles (update/insert) - **FIXED**
- **Status:** ✅ Complete (9/9 fixed)

### ⚠️ Mentor Components
- ⚠️ `components/mentor/MentorProfileForm.tsx` - 4 issues
- ⚠️ `components/MentorView.tsx` - 1 issue
- **Status:** ⚠️ Pending (0/5 fixed)

### ⚠️ Profile Forms
- ⚠️ `components/EditProfileModal.tsx` - 1 issue
- ⚠️ `components/investment-advisor/InvestmentAdvisorProfileForm.tsx` - 5 issues
- ⚠️ `components/investor/InvestorProfileForm.tsx` - 1 issue
- ⚠️ `components/PublicInvestorPage.tsx` - 1 issue
- **Status:** ⚠️ Pending (0/8 fixed)

## Total Progress: 10/23 Fixed (43%)

## Next Steps

1. ✅ Fix Investment Advisor Dashboard - **DONE**
2. ✅ Fix Investor Dashboard - **DONE**
3. ⚠️ Fix Mentor Components - **NEXT**
4. ⚠️ Fix Profile Forms - **AFTER**



