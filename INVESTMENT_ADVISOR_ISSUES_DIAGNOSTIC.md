# Investment Advisor Issues Diagnostic

## 🚨 **CRITICAL ISSUES IDENTIFIED**

### **Issue 1: Broken Filtering Logic**
**Location**: `InvestmentAdvisorView.tsx` lines 113-144
**Problem**: Using `pendingRelationships` from database instead of filtering actual data
**Current Code**:
```typescript
const serviceRequests = useMemo(() => {
  // ... broken logic using pendingRelationships
  return pendingRelationships || [];
}, [pendingRelationships, currentUser?.investment_advisor_code, users, startups]);
```

**Why it's broken**:
- `pendingRelationships` comes from database relationships table
- It's not properly populated or filtered
- It doesn't match the actual user/startup data

### **Issue 2: Missing Pending Startup Requests Logic**
**Location**: `InvestmentAdvisorView.tsx` 
**Problem**: No `pendingStartupRequests` variable defined
**Impact**: Startups that entered advisor codes don't appear in dashboard

### **Issue 3: Missing Pending Investor Requests Logic**
**Location**: `InvestmentAdvisorView.tsx`
**Problem**: No `pendingInvestorRequests` variable defined  
**Impact**: Investors that entered advisor codes don't appear in dashboard

### **Issue 4: Incorrect Accepted Logic**
**Location**: `InvestmentAdvisorView.tsx` lines 147-180
**Problem**: `myInvestors` and `myStartups` don't check `advisor_accepted` field
**Current Code**:
```typescript
const myInvestors = useMemo(() => {
  // Since advisor_accepted field doesn't exist, show all investors with matching codes
  const acceptedInvestors = users.filter(user => 
    user.role === 'Investor' &&
    (user as any).investment_advisor_code_entered === currentUser?.investment_advisor_code
  );
  return acceptedInvestors;
}, [users, currentUser?.investment_advisor_code]);
```

**Why it's wrong**:
- Comment says "advisor_accepted field doesn't exist" - but it DOES exist!
- Shows ALL investors with matching codes, not just accepted ones
- No distinction between pending and accepted

### **Issue 5: Data Flow Problems**
**Location**: `App.tsx` data fetching
**Problem**: Investment advisors might not be getting the right data
**Current**: Uses `startupService.getAllStartupsForInvestmentAdvisor()` but filtering is still broken

## 🔧 **COMPLETE FIX REQUIRED**

### **Step 1: Replace All Filtering Logic**
Replace lines 113-180 in `InvestmentAdvisorView.tsx` with the corrected logic from `DIRECT_INVESTMENT_ADVISOR_FIX.tsx`

### **Step 2: Add Missing Variables**
The component needs these variables:
- `pendingStartupRequests` - startups that entered advisor code but not accepted
- `pendingInvestorRequests` - investors that entered advisor code but not accepted
- `myStartups` - accepted startups (with `advisor_accepted = true`)
- `myInvestors` - accepted investors (with `advisor_accepted = true`)

### **Step 3: Fix serviceRequests**
Replace the broken `pendingRelationships` logic with:
```typescript
const serviceRequests = useMemo(() => {
  const startupRequests = pendingStartupRequests.map(startup => ({
    id: startup.id,
    name: startup.name,
    email: startupUser?.email || '',
    type: 'startup',
    created_at: startup.created_at
  }));

  const investorRequests = pendingInvestorRequests.map(user => ({
    id: user.id,
    name: user.name,
    email: user.email,
    type: 'investor',
    created_at: user.created_at
  }));

  return [...startupRequests, ...investorRequests];
}, [pendingStartupRequests, pendingInvestorRequests, users]);
```

## 🎯 **ROOT CAUSE**

The component is using **database relationships** (`pendingRelationships`) instead of **array filtering** (`startups`, `users`). This is why:

1. **No data appears** - database relationships aren't properly populated
2. **Filtering doesn't work** - wrong data source
3. **Acceptance logic broken** - not checking `advisor_accepted` field

## 🚀 **SOLUTION**

Apply the complete fix from `DIRECT_INVESTMENT_ADVISOR_FIX.tsx` to replace the entire filtering section. This will:

✅ **Fix data source** - use actual arrays instead of database relationships
✅ **Add missing variables** - `pendingStartupRequests`, `pendingInvestorRequests`
✅ **Fix acceptance logic** - properly check `advisor_accepted` field
✅ **Fix serviceRequests** - combine pending startups and investors
✅ **Add debug logging** - track what's happening

The fix is **100% in the frontend filtering logic** - the database is correct!
