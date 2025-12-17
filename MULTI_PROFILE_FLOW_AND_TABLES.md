# Multi-Profile System - Flow and Tables

## Overview
After migration, the system uses **both** old and new tables for backward compatibility. Here's the complete flow:

---

## Tables Used

### 1. **auth.users** (Supabase Auth - UNCHANGED)
- **Purpose**: Authentication only (email, password)
- **Used for**: Login, signup, password reset
- **No changes**: This table stays the same

### 2. **public.users** (Old Table - STILL USED)
- **Purpose**: Existing user data (backward compatibility)
- **Used for**: 
  - Fallback when profile not found in new system
  - Existing queries that haven't been updated yet
- **Status**: Still works, but new profiles go to `user_profiles`

### 3. **public.user_profiles** (NEW - Main Table)
- **Purpose**: Multiple profiles per user
- **Used for**: 
  - All new profile creation
  - Profile switching
  - Multi-profile features
- **Structure**: One row per profile (one user can have multiple rows)

### 4. **public.user_profile_sessions** (NEW)
- **Purpose**: Tracks which profile is currently active
- **Used for**: 
  - Knowing which profile to show
  - Profile switching
- **Structure**: One row per auth user (current active profile)

---

## Complete Flow

### Flow 1: User Login (Existing User)

```
1. User enters email/password
   ↓
2. Supabase Auth validates (auth.users table)
   ↓
3. getCurrentUser() function runs:
   a. First checks: user_profiles + user_profile_sessions
      → If found: Returns profile from user_profiles ✅
   b. If not found: Falls back to users table
      → Returns user from users table ✅
   ↓
4. User sees dashboard with their profile data
```

**Tables Used:**
- `auth.users` (authentication)
- `user_profiles` + `user_profile_sessions` (new system - preferred)
- `users` (fallback - old system)

---

### Flow 2: New User Registration

```
1. User fills registration form
   ↓
2. Creates auth account (auth.users)
   ↓
3. Creates profile in user_profiles table
   ↓
4. Creates session in user_profile_sessions (sets as active)
   ↓
5. User logged in with new profile
```

**Tables Used:**
- `auth.users` (authentication)
- `user_profiles` (new profile)
- `user_profile_sessions` (active profile)

**Note**: New registrations go to `user_profiles`, NOT `users` table

---

### Flow 3: Adding New Profile (Existing User)

```
1. User clicks "Add Profile"
   ↓
2. Fills Form 1 (BasicRegistrationStep with isAddingProfile=true)
   ↓
3. Creates new profile in user_profiles table
   - Same auth_user_id (same email)
   - Different role
   ↓
4. Sets new profile as active in user_profile_sessions
   ↓
5. Fills Form 2 (CompleteRegistrationPage)
   ↓
6. Updates profile in user_profiles table
   ↓
7. User sees new profile's dashboard
```

**Tables Used:**
- `user_profiles` (new profile created)
- `user_profile_sessions` (switched to new profile)

---

### Flow 4: Switching Profiles

```
1. User clicks "Switch Profile" dropdown
   ↓
2. Shows all profiles from user_profiles table
   ↓
3. User selects a profile
   ↓
4. Updates user_profile_sessions (sets selected profile as active)
   ↓
5. getCurrentUser() now returns the selected profile
   ↓
6. App reloads with new profile's data
```

**Tables Used:**
- `user_profiles` (get all profiles)
- `user_profile_sessions` (update active profile)

---

### Flow 5: Getting Current User Data

```
When app needs current user:
   ↓
getCurrentUser() function:
   1. Gets auth user from auth.users
   2. Checks user_profile_sessions for active profile
   3. Gets profile from user_profiles
   4. If not found, falls back to users table
   ↓
Returns user data
```

**Tables Used (in order):**
1. `auth.users` (get authenticated user)
2. `user_profile_sessions` (get active profile ID)
3. `user_profiles` (get profile data) ✅ Preferred
4. `users` (fallback if profile not found) ✅ Backward compatible

---

## Which Table is Used When?

### ✅ **user_profiles** is used for:
- All new registrations
- All new profile creation
- Profile switching
- Multi-profile features
- Getting current active profile (preferred)

### ✅ **users** is used for:
- Fallback when profile not in new system
- Existing queries that haven't been updated
- Backward compatibility
- Old users who haven't been migrated yet

### ✅ **user_profile_sessions** is used for:
- Tracking active profile
- Profile switching
- Knowing which profile to show

### ✅ **auth.users** is used for:
- Authentication (login/signup)
- Password management
- Email verification
- Session management

---

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────┐
│                    USER LOGS IN                         │
└─────────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────┐
│              auth.users (Authentication)                 │
│              - Validates email/password                  │
└─────────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────┐
│        getCurrentUser() Function                         │
│                                                          │
│  1. Check user_profile_sessions                         │
│     └─> Get current_profile_id                         │
│         └─> Get profile from user_profiles ✅           │
│                                                          │
│  2. If not found, check users table                     │
│     └─> Get user from users ✅ (fallback)               │
└─────────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────┐
│              APP SHOWS USER DATA                         │
│              (From active profile)                       │
└─────────────────────────────────────────────────────────┘
```

---

## Migration Status

### After Running Migration:

**Existing Users:**
- ✅ Data copied from `users` → `user_profiles`
- ✅ One profile created per user
- ✅ Session created in `user_profile_sessions`
- ✅ `users` table still has original data (backup)

**New Users:**
- ✅ Created directly in `user_profiles`
- ✅ NOT created in `users` table
- ✅ Session created in `user_profile_sessions`

**Profile Switching:**
- ✅ Uses `user_profiles` table
- ✅ Updates `user_profile_sessions`
- ✅ `users` table not used for switching

---

## Important Notes

### Backward Compatibility
- ✅ Old `users` table still works
- ✅ Existing code continues to function
- ✅ Gradual migration possible
- ✅ No breaking changes

### New Features
- ✅ Multi-profile uses `user_profiles`
- ✅ Profile switching uses `user_profile_sessions`
- ✅ New registrations go to `user_profiles`

### Future (Optional)
- Eventually, you can deprecate `users` table
- All queries can be updated to use `user_profiles`
- But it's not required - both can coexist

---

## Summary

**Main Table**: `user_profiles` (for all new features)
**Session Table**: `user_profile_sessions` (tracks active profile)
**Fallback Table**: `users` (for backward compatibility)
**Auth Table**: `auth.users` (unchanged, for authentication)

The system intelligently uses the new tables when available, and falls back to old tables when needed. This ensures zero downtime and backward compatibility! 🚀

