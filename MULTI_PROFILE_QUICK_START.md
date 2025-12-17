# Multi-Profile System - Quick Start Checklist

## ✅ Implementation Checklist

### Phase 1: Database Setup
- [ ] **Backup your database** (IMPORTANT!)
- [ ] Open Supabase SQL Editor
- [ ] Copy and paste `CREATE_MULTI_PROFILE_SYSTEM.sql`
- [ ] Run the script
- [ ] Verify migration:
  ```sql
  SELECT COUNT(*) FROM user_profiles;
  SELECT COUNT(*) FROM user_profile_sessions;
  ```
- [ ] Check that existing users have profiles:
  ```sql
  SELECT u.email, p.role, p.name 
  FROM user_profiles p 
  JOIN auth.users u ON u.id = p.auth_user_id 
  LIMIT 10;
  ```

### Phase 2: Backend Code
- [ ] Update `lib/auth.ts`:
  - [ ] Add `getUserProfiles()` function
  - [ ] Add `switchProfile()` function
  - [ ] Add `createProfile()` function
  - [ ] Update `getCurrentUser()` to use `get_current_profile()`
  - [ ] Update `signUp()` to create profiles instead of users
- [ ] Test in browser console:
  ```typescript
  // Test getting profiles
  await authService.getUserProfiles()
  
  // Test switching (if you have multiple)
  await authService.switchProfile(profileId)
  ```

### Phase 3: Frontend UI
- [ ] Create `components/ProfileSwitcher.tsx`
- [ ] Create `components/AddProfileModal.tsx`
- [ ] Add ProfileSwitcher to your main app (header/sidebar)
- [ ] Add "Add Profile" button
- [ ] Test profile switching UI
- [ ] Test adding new profile

### Phase 4: Integration
- [ ] Update App.tsx to handle profile switching
- [ ] Update data fetching to reload on profile switch
- [ ] Test complete flow:
  - [ ] Login
  - [ ] See profile switcher
  - [ ] Switch profile
  - [ ] Add new profile
  - [ ] Switch to new profile
  - [ ] Verify data is separate per profile

### Phase 5: Testing
- [ ] Test with existing user (should have one profile)
- [ ] Test creating second profile with same email
- [ ] Test switching between profiles
- [ ] Test that data is separate per profile
- [ ] Test all role-specific features work
- [ ] Test on mobile if applicable

## 🚨 Important Notes

1. **Backup First**: Always backup your database before running migrations
2. **Test in Dev**: Test in development/staging before production
3. **Foreign Keys**: You may need to update foreign keys in other tables
4. **RLS Policies**: The script creates RLS policies, but verify they work for your use case

## 📝 Common Issues & Solutions

### Issue: "Profile does not belong to this user"
- **Solution**: Check that `auth_user_id` matches the logged-in user

### Issue: "You already have a [Role] profile"
- **Solution**: The UNIQUE constraint prevents duplicate roles. Remove it if you need multiple profiles of same role:
  ```sql
  ALTER TABLE user_profiles DROP CONSTRAINT user_profiles_auth_user_id_role_key;
  ```

### Issue: Data not updating after profile switch
- **Solution**: Make sure you're reloading data after switching:
  ```typescript
  await authService.switchProfile(profileId);
  window.location.reload(); // Or update your state
  ```

### Issue: Foreign key errors
- **Solution**: Update foreign keys to reference `user_profiles.id` instead of `users.id`

## 🎯 Success Criteria

You'll know it's working when:
- ✅ User can see all their profiles in a switcher
- ✅ User can switch between profiles
- ✅ User can add new profile with same email
- ✅ Each profile shows different data
- ✅ Existing users still work (migrated correctly)

## 📚 Reference Files

- `CREATE_MULTI_PROFILE_SYSTEM.sql` - Database migration
- `MULTI_PROFILE_IMPLEMENTATION_GUIDE.md` - Detailed guide
- `MULTI_PROFILE_CODE_CHANGES.md` - Code examples
- `MULTI_PROFILE_SUMMARY.md` - Overview

## ⏱️ Time Estimate

- Database: 30 min - 1 hour
- Backend: 2-3 hours
- Frontend: 2-3 hours
- Testing: 1-2 hours
- **Total: 5-9 hours**

Good luck! 🚀


