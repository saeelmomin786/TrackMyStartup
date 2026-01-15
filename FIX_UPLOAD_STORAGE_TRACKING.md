# ✅ Fix: Upload Storage Tracking Using auth_user_id

## 🎯 Problem
When uploading documents from the startup dashboard, storage size was not increasing because upload functions were using `currentUser.id` (profile ID) instead of `auth_user_id` (UUID from auth.users).

---

## ✅ What Was Fixed

### **1. StartupDashboardTab.tsx - Contract Upload**
**Before:**
```typescript
userId: currentUser.id, // ❌ Profile ID
```

**After:**
```typescript
// Get auth_user_id (UUID from auth.users) for storage tracking
const { data: { user: authUser } } = await supabase.auth.getUser();
const authUserId = authUser.id;
userId: authUserId, // ✅ Auth User ID (UUID)
```

### **2. StartupDashboardTab.tsx - Agreement Upload**
Same fix applied to `handleAgreementUpload` function.

### **3. complianceRulesIntegrationService.ts**
**Already Correct:** This service gets `user_id` from the `startups` table, which is already the `auth_user_id`. No changes needed.

---

## ✅ How It Works Now

```
User uploads file from dashboard
  ↓
Get auth_user_id from supabase.auth.getUser()
  ↓
uploadFileWithTracking({ userId: authUserId, ... })
  ↓
storageService.trackFileUpload(authUserId, ...)
  ↓
Inserts record into user_storage_usage with correct user_id
  ↓
Database trigger updates user_subscriptions.storage_used_mb
  ↓
✅ Storage usage increases correctly!
```

---

## 🧪 Testing

1. **Upload a document** from the Dashboard tab (contract or agreement)
2. **Check browser console** - you should see:
   ```
   📄 Using auth_user_id for storage tracking: [uuid]
   ✅ File uploaded and storage tracked: { ... }
   ```
3. **Go to Account Tab** - storage usage should increase immediately
4. **Verify in database:**
   ```sql
   SELECT * FROM user_storage_usage 
   WHERE user_id = '[your-auth-user-id]' 
   ORDER BY created_at DESC 
   LIMIT 5;
   ```

---

## 📝 Files Changed

1. ✅ `components/startup-health/StartupDashboardTab.tsx`
   - `handleContractUpload()` - Now uses `auth_user_id`
   - `handleAgreementUpload()` - Now uses `auth_user_id`

2. ✅ `components/startup-health/AccountTab.tsx` (Already fixed earlier)
   - Now uses `auth_user_id` for reading storage

---

## ✅ Status

**Fixed!** All upload functions now use `auth_user_id` (UUID from auth.users) for storage tracking, which matches the `user_id` column in the `user_storage_usage` table.
