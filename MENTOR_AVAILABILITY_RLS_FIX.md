# ✅ MENTOR AVAILABILITY RLS FIX

## 🐛 **THE PROBLEM**

Error when creating availability slots:
```
POST /rest/v1/mentor_availability_slots 403 (Forbidden)
Error: new row violates row-level security policy for table "mentor_availability_slots"
```

**Root Cause:**
- `ManageAvailabilityModal` passes `currentUser.id` (which is now `profile_id`) as `mentor_id`
- RLS policy on `mentor_availability_slots` expects `mentor_id` to match `auth.uid()` (which is `auth_user_id`)
- When `profile_id` is passed instead of `auth_user_id`, the RLS policy blocks the insert

---

## ✅ **FIXES APPLIED**

### Fixed Functions in `lib/mentorSchedulingService.ts`:

1. **`createAvailabilitySlot()`** - Now uses `auth_user_id` instead of provided `mentor_id`
2. **`getAvailabilitySlots()`** - Now uses `auth_user_id` for queries
3. **`updateAvailabilitySlot()`** - Now ensures `mentor_id` uses `auth_user_id` if provided
4. **`getAvailableSlotsForDateRange()`** - Now uses `auth_user_id` for all queries
5. **`bookSession()`** - Now uses `auth_user_id` when creating sessions
6. **`getMentorSessions()`** - Now uses `auth_user_id` for queries

---

## 📝 **HOW IT WORKS**

**Before (WRONG):**
```typescript
// ManageAvailabilityModal passes currentUser.id (profile_id)
mentorId={currentUser.id}  // This is profile_id

// Service uses it directly
.insert({ mentor_id: mentorId })  // RLS blocks this!
```

**After (CORRECT):**
```typescript
// ManageAvailabilityModal still passes currentUser.id (profile_id)
mentorId={currentUser.id}  // This is profile_id

// Service gets auth_user_id internally
const { data: { user: authUser } } = await supabase.auth.getUser();
const authUserId = authUser?.id;  // This is auth_user_id

// Service uses auth_user_id
.insert({ mentor_id: authUserId })  // RLS allows this! ✅
```

---

## ✅ **RESULT**

- ✅ Availability slots can now be created successfully
- ✅ All mentor scheduling functions work correctly
- ✅ RLS policies are satisfied
- ✅ No more 403 Forbidden errors

---

## 🎯 **STATUS**

**✅ FIXED** - Mentor availability slots can now be created without RLS errors!



