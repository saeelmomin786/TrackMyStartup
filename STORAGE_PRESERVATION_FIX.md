# Storage Preservation Fix for Plan Upgrades/Downgrades

## Problem
When a user upgraded or downgraded their plan, the new subscription was created without preserving the existing storage usage. The `storage_used_mb` field was set to `null` or `0`, even though the user had already used storage.

## Solution
Updated both `/api/subscriptions/upgrade` and `/api/subscriptions/downgrade` endpoints to:

1. **Get storage usage from old subscription** (if available)
2. **Calculate from `user_storage_usage` table** (if subscription doesn't have it)
3. **Set `storage_used_mb` in new subscription** to preserve existing usage

---

## Implementation Details

### Upgrade Endpoint (`/api/subscriptions/upgrade`)

**Before:**
```javascript
const newSubscriptionInsert = {
  // ... other fields
  // storage_used_mb was missing - started at null/0
};
```

**After:**
```javascript
// 8.5. Get current storage usage from old subscription (preserve existing storage)
let currentStorageUsedMB = null;
if (currentSubscription.storage_used_mb !== null && currentSubscription.storage_used_mb !== undefined) {
  // Use storage from old subscription (updated by trigger)
  currentStorageUsedMB = parseFloat(currentSubscription.storage_used_mb.toString()) || 0;
  console.log('[upgrade] 📦 Preserving storage usage from old subscription:', currentStorageUsedMB, 'MB');
} else {
  // If old subscription doesn't have storage_used_mb, calculate from user_storage_usage table
  try {
    const { data: storageTotal, error: storageError } = await supabase.rpc('get_user_storage_total', {
      p_user_id: user_id
    });
    if (!storageError && storageTotal !== null) {
      currentStorageUsedMB = parseFloat(storageTotal.toString()) || 0;
      console.log('[upgrade] 📦 Calculated storage usage from user_storage_usage:', currentStorageUsedMB, 'MB');
    }
  } catch (storageCalcError) {
    console.warn('[upgrade] ⚠️ Could not calculate storage usage, will start at 0:', storageCalcError);
    currentStorageUsedMB = 0;
  }
}

const newSubscriptionInsert = {
  // ... other fields
  storage_used_mb: currentStorageUsedMB // Preserve existing storage usage
};
```

### Downgrade Endpoint (`/api/subscriptions/downgrade`)

Same logic applied to downgrade endpoint (except for downgrade to Free - see below).

---

## How It Works

### Scenario 1: Upgrade (Basic → Premium)

**Before Fix:**
1. User has Basic plan with 500 MB used
2. User upgrades to Premium
3. New Premium subscription created with `storage_used_mb = null` ❌
4. User sees 0 MB used (incorrect!)

**After Fix:**
1. User has Basic plan with 500 MB used
2. User upgrades to Premium
3. System copies `storage_used_mb = 500` from old subscription ✅
4. New Premium subscription created with `storage_used_mb = 500` ✅
5. User sees 500 MB used (correct!) ✅
6. Storage limit increases from 1 GB to 10 GB ✅

### Scenario 2: Downgrade (Premium → Basic)

**Before Fix:**
1. User has Premium plan with 2 GB used
2. User downgrades to Basic
3. New Basic subscription created with `storage_used_mb = null` ❌
4. User sees 0 MB used (incorrect!)

**After Fix:**
1. User has Premium plan with 2 GB used
2. User downgrades to Basic
3. System copies `storage_used_mb = 2048` from old subscription ✅
4. New Basic subscription created with `storage_used_mb = 2048` ✅
5. User sees 2 GB used (correct!) ✅
6. **Note:** User exceeds Basic limit (1 GB), but storage is preserved ✅

### Scenario 3: Downgrade to Free

**Special Case:**
- No new subscription is created
- Old subscription is cancelled (autopay stopped)
- Storage remains in `user_storage_usage` table
- Free users calculate storage directly from `user_storage_usage` table (not from subscription)
- **No changes needed** - already works correctly ✅

---

## Storage Calculation Flow

### For Paid Users (with subscription):
```
User uploads file
  ↓
user_storage_usage record created
  ↓
Database trigger fires → Updates user_subscriptions.storage_used_mb
  ↓
Frontend reads: user_subscriptions.storage_used_mb
```

### For Free Users (no subscription):
```
User uploads file
  ↓
user_storage_usage record created
  ↓
Frontend calculates: SUM(file_size_mb) from user_storage_usage
```

---

## Testing Checklist

- [x] Upgrade Basic → Premium: Storage preserved ✅
- [x] Downgrade Premium → Basic: Storage preserved ✅
- [x] Downgrade to Free: Storage still accessible ✅
- [x] Upgrade with null storage_used_mb: Calculates from user_storage_usage ✅
- [x] Storage limit updates correctly (1 GB → 10 GB on upgrade) ✅
- [x] Storage limit updates correctly (10 GB → 1 GB on downgrade) ✅

---

## Database Trigger

The existing trigger `update_subscription_storage_usage()` continues to work:

```sql
CREATE OR REPLACE FUNCTION update_subscription_storage_usage()
RETURNS TRIGGER AS $$
BEGIN
    -- Update user_subscriptions.storage_used_mb when storage changes
    UPDATE user_subscriptions
    SET storage_used_mb = (
        SELECT get_user_storage_total(NEW.user_id)
    ),
    updated_at = NOW()
    WHERE user_id = NEW.user_id
    AND status = 'active';
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

**Note:** This trigger updates **all active subscriptions** for the user. Since we preserve storage in the new subscription, the trigger will keep it updated going forward.

---

## Logs

You'll now see these logs when upgrading/downgrading:

```
[upgrade] 📦 Preserving storage usage from old subscription: 500 MB
[upgrade] ✅ New subscription created in database
```

or

```
[upgrade] 📦 Calculated storage usage from user_storage_usage: 500 MB
[upgrade] ✅ New subscription created in database
```

---

## Summary

✅ **Fixed:** Storage usage is now preserved when upgrading/downgrading plans
✅ **Works for:** Basic → Premium, Premium → Basic, Premium → Free
✅ **Backward compatible:** Handles cases where old subscription doesn't have `storage_used_mb`
✅ **Future-proof:** Database trigger continues to update storage automatically
