# Profile Forms - Simple Summary

## ✅ YES - Reuse the Same Forms!

### Registration Forms:
1. **Form 1**: `BasicRegistrationStep` - Basic info
2. **Form 2**: `CompleteRegistrationPage` - Documents & details

### For Adding Profile:
- **Form 1**: Same form, but **skip email/password** (user already logged in)
- **Form 2**: **EXACTLY THE SAME** - no changes needed!

---

## Visual Comparison

### Normal Registration Flow:
```
Form 1: BasicRegistrationStep
├── Email ✅
├── Password ✅
├── Name ✅
├── Role ✅
└── Role-specific fields ✅
    ↓
Form 2: CompleteRegistrationPage
├── Documents ✅
├── Founders ✅
├── Profile Info ✅
└── Compliance ✅
```

### Adding Profile Flow:
```
Form 1: BasicRegistrationStep (Modified)
├── Email ❌ (skip - use current user's email)
├── Password ❌ (skip - already logged in)
├── Name ✅
├── Role ✅
└── Role-specific fields ✅
    ↓
Form 2: CompleteRegistrationPage (SAME!)
├── Documents ✅
├── Founders ✅
├── Profile Info ✅
└── Compliance ✅
```

---

## What You Need to Do

### 1. Modify BasicRegistrationStep
- Add prop: `isAddingProfile={true}`
- Hide email/password fields when `isAddingProfile={true}`
- Show current user's email (read-only)
- Change submit to create profile instead of signup

### 2. Keep CompleteRegistrationPage Same
- **No changes needed!**
- It will work the same way
- Just update the profile instead of creating user

---

## Code Change (Minimal)

```typescript
// In BasicRegistrationStep.tsx
{!isAddingProfile && (
  <>
    <Input label="Email" ... />
    <Input label="Password" ... />
  </>
)}

{isAddingProfile && (
  <div>Email: {currentUser.email} (Your Account)</div>
)}
```

That's it! Everything else stays the same! 🎯


