# What Does `get_user_role()` Migration Do?

## 🔍 Current Situation

**Before Migration:**
```sql
-- Current function queries the OLD users table
SELECT role FROM public.users WHERE id = auth.uid()
```

**After Migration:**
```sql
-- New function queries user_profiles table FIRST
SELECT role FROM public.user_profiles WHERE auth_user_id = auth.uid()
-- Falls back to users table if not found (for backward compatibility)
```

---

## ✅ What Changes

### 1. **Internal Logic Only**
- Function **signature stays exactly the same**: `get_user_role() RETURNS TEXT`
- Function **name stays the same**: `get_user_role()`
- **Return format stays the same**: TEXT value (like "Investor", "Startup", etc.)

### 2. **Data Source Changes**
- Now looks in `user_profiles` table FIRST (new system)
- Falls back to `users` table if not found (old system support)

---

## 🛡️ What Stays the Same (No Impact)

### ✅ Frontend Code
- **NO changes needed** - Frontend doesn't call this function directly
- Frontend calls other functions that use this internally

### ✅ Storage Policies (File Access)
- **Still works** - All storage policies using `get_user_role()` will work the same
- Files are still accessible based on user role

### ✅ RLS Policies (Row Level Security)
- **Still works** - All RLS policies using `get_user_role()` continue to work
- Data access permissions remain the same

### ✅ Helper Functions
All these functions use `get_user_role()` internally and will still work:
- `is_admin()` - Checks if user is Admin
- `is_startup()` - Checks if user is Startup
- `is_investor()` - Checks if user is Investor
- `is_ca_or_cs()` - Checks if user is CA or CS
- `is_facilitator()` - Checks if user is Facilitator

---

## 🎯 Why This Migration is Needed

### Problem:
- New users are stored in `user_profiles` table
- Old users are in `users` table
- `get_user_role()` was only looking in `users` table
- **Result**: New users' roles weren't being detected correctly in storage policies and RLS

### Solution:
- Check `user_profiles` FIRST (new users)
- Fallback to `users` table (old users)
- **Result**: Works for both old and new users ✅

---

## 🧪 What Will Happen After Migration

### Scenario 1: New User (in user_profiles only)
```
1. Function checks user_profiles → ✅ Found role "Investor"
2. Returns "Investor"
3. Storage policies work correctly
4. RLS policies work correctly
```

### Scenario 2: Old User (in users table only)
```
1. Function checks user_profiles → ❌ Not found
2. Falls back to users table → ✅ Found role "Startup"
3. Returns "Startup"
4. Everything works as before
```

### Scenario 3: User with Multiple Profiles
```
1. Function checks user_profiles → ✅ Found multiple profiles
2. Gets most recent one (ORDER BY created_at DESC LIMIT 1)
3. Returns that role
4. Works correctly
```

---

## ⚠️ Potential Edge Cases (Very Rare)

### Edge Case 1: User Has Profiles with Different Roles
**Current Logic:** Returns most recent profile's role
**Impact:** Minimal - This is expected behavior for multi-profile system

### Edge Case 2: User Exists in Both Tables with Different Roles
**Current Logic:** Returns role from user_profiles (newer system)
**Impact:** Correct behavior - user_profiles is source of truth for new system

---

## ✅ Safety Measures Built In

1. **Fallback to old table** - Won't break existing users
2. **Same function signature** - Nothing calling it needs to change
3. **Returns same format** - TEXT value, just like before
4. **Idempotent** - Can run multiple times safely

---

## 🚀 Testing After Migration

### Quick Test:
```sql
-- Run this in Supabase SQL Editor:
SELECT get_user_role();  -- Should return your role (e.g., "Investor")
```

### What to Check:
1. ✅ File uploads/downloads still work (storage policies)
2. ✅ Data visibility still correct (RLS policies)
3. ✅ Dashboard access still works (role checks)

---

## 📝 Summary

| Aspect | Impact |
|--------|--------|
| **Function Name** | ✅ No change |
| **Function Signature** | ✅ No change |
| **Return Format** | ✅ No change (TEXT) |
| **Frontend Code** | ✅ No changes needed |
| **Storage Policies** | ✅ Continue working |
| **RLS Policies** | ✅ Continue working |
| **Helper Functions** | ✅ Continue working |
| **Old Users** | ✅ Still supported (fallback) |
| **New Users** | ✅ Now properly detected |

---

## 🎯 Bottom Line

**This migration is SAFE because:**
- Only changes WHERE the function looks for data
- Keeps everything else exactly the same
- Has fallback for backward compatibility
- No frontend changes needed
- No breaking changes to existing functionality

**The migration FIXES issues where:**
- New users' roles weren't being detected
- Storage policies might fail for new users
- RLS policies might fail for new users


