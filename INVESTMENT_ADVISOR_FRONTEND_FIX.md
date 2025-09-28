# Investment Advisor Frontend Fix

## 🐛 **Root Cause Identified**

The issue is in the **frontend filtering logic** in `InvestmentAdvisorView.tsx`. The component is not properly filtering startups and investors based on the investment advisor code.

## 🔧 **Fixes Required**

### **1. Replace the existing filtering logic in InvestmentAdvisorView.tsx**

**Current Problem:**
- The component uses `serviceRequests` from `pendingRelationships` (database relationships)
- But it's not properly filtering the actual startups and users
- The filtering logic is incomplete and doesn't handle the `advisor_accepted` field correctly

**Solution:**
Replace the existing filtering logic with the corrected version from `FIX_INVESTMENT_ADVISOR_FRONTEND_FILTERING.tsx`

### **2. Key Changes Needed:**

#### **A. Pending Startup Requests Filtering:**
```typescript
// BEFORE (incorrect)
const serviceRequests = useMemo(() => {
  return pendingRelationships || [];
}, [pendingRelationships, currentUser?.investment_advisor_code, users, startups]);

// AFTER (correct)
const pendingStartupRequests = useMemo(() => {
  if (!startups || !Array.isArray(startups) || !users || !Array.isArray(users)) {
    return [];
  }

  return startups.filter(startup => {
    const startupUser = users.find(user => 
      user.role === 'Startup' && 
      user.id === startup.user_id
    );
    
    if (!startupUser) return false;

    const hasEnteredCode = (startupUser as any).investment_advisor_code_entered === currentUser?.investment_advisor_code;
    const isNotAccepted = !(startupUser as any).advisor_accepted;

    return hasEnteredCode && isNotAccepted;
  });
}, [startups, users, currentUser?.investment_advisor_code]);
```

#### **B. Pending Investor Requests Filtering:**
```typescript
// BEFORE (incorrect)
const myInvestors = useMemo(() => {
  const acceptedInvestors = users.filter(user => 
    user.role === 'Investor' &&
    (user as any).investment_advisor_code_entered === currentUser?.investment_advisor_code
  );
  return acceptedInvestors;
}, [users, currentUser?.investment_advisor_code]);

// AFTER (correct)
const pendingInvestorRequests = useMemo(() => {
  if (!users || !Array.isArray(users)) {
    return [];
  }

  return users.filter(user => {
    const hasEnteredCode = user.role === 'Investor' && 
      (user as any).investment_advisor_code_entered === currentUser?.investment_advisor_code;
    const isNotAccepted = !(user as any).advisor_accepted;

    return hasEnteredCode && isNotAccepted;
  });
}, [users, currentUser?.investment_advisor_code]);
```

#### **C. Accepted Startups Filtering:**
```typescript
// BEFORE (incorrect)
const myStartups = useMemo(() => {
  const acceptedStartups = startups.filter(startup => 
    (startup as any).investment_advisor_code === currentUser?.investment_advisor_code
  );
  return acceptedStartups;
}, [startups, currentUser?.investment_advisor_code]);

// AFTER (correct)
const myStartups = useMemo(() => {
  if (!startups || !Array.isArray(startups) || !users || !Array.isArray(users)) {
    return [];
  }

  return startups.filter(startup => {
    const startupUser = users.find(user => 
      user.role === 'Startup' && 
      user.id === startup.user_id
    );
    
    if (!startupUser) return false;

    const hasEnteredCode = (startupUser as any).investment_advisor_code_entered === currentUser?.investment_advisor_code;
    const isAccepted = (startupUser as any).advisor_accepted === true;

    return hasEnteredCode && isAccepted;
  });
}, [startups, users, currentUser?.investment_advisor_code]);
```

### **3. Debug Logging**

Add comprehensive debug logging to track:
- Total startups and users loaded
- Current advisor code
- Filtering results
- Individual startup/user checks

### **4. Data Flow Issues**

**Problem:** The component is using `pendingRelationships` from the database, but it should be filtering the actual `startups` and `users` arrays.

**Solution:** Use the actual data arrays (`startups`, `users`) instead of relying on database relationships for the main filtering logic.

## 🧪 **Testing Steps**

1. **Apply the frontend fix** to `InvestmentAdvisorView.tsx`
2. **Test with Siddhi (IA-162090)** - should see 2 pending startup requests
3. **Test with Sarvesh (IA-629552)** - should see 2 pending startup requests  
4. **Test with Farah (INV-00C39B)** - should see 1 pending startup request
5. **Verify acceptance workflow** works correctly

## 📊 **Expected Results**

After applying the frontend fix:
- ✅ **Investment advisors** will see startups that entered their codes
- ✅ **Startups appear** in "My Startup Offers" table
- ✅ **Advisors can accept/reject** with financial terms
- ✅ **Status tracking** works properly (Pending → Accepted)

The issue is **100% in the frontend filtering logic**, not the database!
