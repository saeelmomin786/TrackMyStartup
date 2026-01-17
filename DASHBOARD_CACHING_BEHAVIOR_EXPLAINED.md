# Dashboard Caching Behavior - Account & Billing Tab

## The Issue You Observed

**What happened:**
1. You deleted a subscription from the database (user_subscriptions table)
2. Billing cycles were also deleted (CASCADE constraint)
3. Dashboard still showed the old subscription details and billing cycles

**Why?** The AccountTab component wasn't aware that external changes were made to the database.

---

## How Data Flows

```
loadAccountData() [Main Refresh Function]
├─ subscriptionService.getUserSubscription(authUserId)
│  └─ Queries: user_subscriptions WHERE user_id = profileId AND status = 'active'
│  └─ Returns: Subscription object or NULL
│
└─ IF subscription found:
   └─ paymentHistoryService.getAllBillingCyclesForUser(authUserId)
      └─ Gets all subscription IDs for user
      └─ Queries: billing_cycles WHERE subscription_id IN (subscription_ids)
      └─ Returns: BillingCycle[] array

└─ IF NO subscription found:
   └─ Clears billingCycles state to empty array []
```

---

## What Triggers `loadAccountData()` Refresh

The component automatically reloads account data on these events:

### 1. **Component Mount** (Initial Load)
```typescript
const mountTimer = setTimeout(() => {
  loadAccountData();
}, 1000); // Waits 1 second after component mounts
```

### 2. **Tab Becomes Visible**
```typescript
const handleVisibilityChange = () => {
  if (!document.hidden) {
    setTimeout(() => loadAccountData(), 500);
  }
};
document.addEventListener('visibilitychange', handleVisibilityChange);
```
**How to trigger:** Switch browser tabs → come back to this tab

### 3. **Window Gets Focus**
```typescript
const handleFocus = () => {
  setTimeout(() => loadAccountData(), 500);
};
window.addEventListener('focus', handleFocus);
```
**How to trigger:** Click outside browser → click back on browser window

### 4. **Payment Success Event**
```typescript
const handlePaymentSuccess = (event: Event) => {
  setTimeout(() => loadAccountData(), 1500);
};
window.addEventListener('payment-success', handlePaymentSuccess);
```
**How to trigger:** Automatic when payment completes

---

## What Does NOT Trigger Refresh

- ❌ Direct database changes (manual deletes, updates)
- ❌ Changes made in other applications
- ❌ Changes made by other users
- ❌ Scheduled/time-based updates

**Why?** The component can't know about external changes unless the database pushes notifications (real-time subscriptions) or the component checks via an event.

---

## How to Refresh Dashboard Data

### Option 1: Hard Refresh (Fastest)
```
Press: Ctrl+Shift+R  (Windows/Linux)
       Cmd+Shift+R   (Mac)
```
- Clears all browser cache
- Reloads entire page from scratch
- Component initializes fresh with current database state

### Option 2: Switch Tabs
```
1. Click on another browser tab
2. Click back to this tab
```
- Triggers visibility change event
- Calls loadAccountData() automatically
- Re-queries database for fresh data

### Option 3: Click on Window
```
1. Click outside browser window
2. Click back on browser window
```
- Triggers focus event
- Calls loadAccountData() automatically
- Re-queries database for fresh data

### Option 4: Wait for Payment
```
Complete a payment transaction
```
- Emits 'payment-success' event automatically
- Component refreshes data after 1500ms
- Shows newly created subscription

---

## Database Cascade Behavior

The foreign key constraint ensures data consistency:

```sql
-- In billing_cycles table
subscription_id UUID NOT NULL REFERENCES user_subscriptions(id) ON DELETE CASCADE
```

**What this means:**
- When subscription deleted → ALL billing_cycles automatically deleted
- No orphaned records
- Dashboard queries will return empty array
- No manual cleanup needed

---

## Dashboard Logic Flow

### When Subscription Exists
```
getUserSubscription() → Returns subscription object
├─ setSubscription(subscription) ✅ Shows subscription details
└─ getAllBillingCyclesForUser() → Returns billing cycles array
   └─ setBillingCycles(cycles) ✅ Shows billing history
```

**Display:**
- ✅ Plan name and tier
- ✅ Subscription status
- ✅ Billing cycle history
- ✅ Payment history

### When Subscription Deleted
```
getUserSubscription() → Returns NULL
├─ setSubscription(null) ✅
└─ setBillingCycles([]) ✅ Empty array set directly
```

**Display:**
- Shows: "You're currently on the Basic Plan"
- Shows: "View Plans & Subscribe" button
- No billing cycles shown
- No payment history shown

---

## Debugging Tips

### If Dashboard Shows Deleted Subscription:

1. **Check Network Tab**
   - Open DevTools → Network tab
   - Filter by "billing_cycles" or "user_subscriptions"
   - Do you see fresh requests?
   - If not → data is cached in memory

2. **Check Console Logs**
   - Look for: `📊 AccountTab - Loaded subscription:`
   - If shows old subscription → component hasn't reloaded
   - If shows NULL → component reloaded correctly

3. **Verify Database State**
   ```sql
   SELECT * FROM user_subscriptions WHERE user_id = 'your-profile-id';
   SELECT * FROM billing_cycles WHERE subscription_id = 'subscription-id';
   ```
   - Should be empty if deleted

4. **Force Component Reload**
   - Hard refresh: Ctrl+Shift+R
   - Should show "You're on Basic Plan"

---

## Recommended Improvements (Future)

### 1. Add Real-Time Subscriptions
```typescript
// Use Supabase Realtime to get notified of database changes
const subscription = supabase
  .from('user_subscriptions')
  .on('*', payload => {
    console.log('Subscription changed!', payload);
    loadAccountData(); // Auto-refresh
  })
  .subscribe();
```

### 2. Add Polling (Simple Solution)
```typescript
// Refresh data every 30 seconds
useEffect(() => {
  const interval = setInterval(() => {
    loadAccountData();
  }, 30000);
  return () => clearInterval(interval);
}, [authUserId]);
```

### 3. Add Manual Refresh Button
```typescript
<Button onClick={() => loadAccountData()}>
  <RefreshCw className="h-4 w-4 mr-2" />
  Refresh Data
</Button>
```

---

## Summary

✅ **Dashboard behavior is correct**
- Data properly cleared when subscription deleted
- Cascade constraints prevent orphaned records
- Component reloads on all expected events

✅ **Your observation is normal**
- External database changes don't auto-refresh UI
- This is standard component behavior
- Just need to trigger refresh (tab switch, hard refresh, etc.)

✅ **Payment flow is fixed**
- All 4 critical bugs fixed
- Subscriptions creating with correct data
- Database constraints working properly

