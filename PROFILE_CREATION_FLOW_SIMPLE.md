# Profile Creation Flow - Simple Guide

## Quick Answer: How to Add Another Profile

### Current Situation
- User already has account (e.g., as Mentor)
- User is logged in
- User wants to add another profile (e.g., as Startup)

### Simple Flow:

```
1. User clicks "Add New Profile" button
   ↓
2. Modal opens with form
   ↓
3. User selects role (e.g., "Startup")
   ↓
4. User fills name and role-specific fields
   ↓
5. User clicks "Create Profile"
   ↓
6. System creates new profile (same email, different role)
   ↓
7. New profile becomes active
   ↓
8. User sees new profile's dashboard
```

---

## Detailed Steps

### Step 1: User Clicks "Add New Profile"
**Where**: Dashboard, Header, or Settings page
**Button**: `[Add New Profile]` or `[+ Add Profile]`

### Step 2: Modal Opens
**Shows**:
- Role dropdown (Investor, Startup, Mentor, etc.)
- Name input field
- Role-specific fields (appear based on selected role)

### Step 3: User Fills Form
**Example for Startup**:
- Role: "Startup" (selected from dropdown)
- Name: "John Doe"
- Startup Name: "My Tech Startup" (required for Startup role)

### Step 4: User Submits
**What happens**:
1. ✅ Check: Does user already have this role? → If yes, show error
2. ✅ Create new profile in database (same email, new role)
3. ✅ Set new profile as active
4. ✅ Close modal
5. ✅ Reload app with new profile

### Step 5: Done!
- New profile is created
- New profile is now active
- User sees new profile's data
- Can switch back to old profile anytime

---

## Visual Example

### Before Adding Profile:
```
┌─────────────────────────────┐
│  Logged in as:              │
│  Email: john@example.com    │
│  Active Profile: Mentor     │
│                             │
│  [Switch Profile ▼]         │
│  [Add New Profile] ← Click  │
└─────────────────────────────┘
```

### After Clicking "Add New Profile":
```
┌─────────────────────────────┐
│  Add New Profile            │
├─────────────────────────────┤
│  Role: [Startup ▼]          │
│  Name: [John Doe]           │
│  Startup Name: [My Tech...] │
│                             │
│  [Cancel] [Create Profile]  │
└─────────────────────────────┘
```

### After Creating Profile:
```
┌─────────────────────────────┐
│  Logged in as:              │
│  Email: john@example.com    │
│  Active Profile: Startup ← NEW│
│                             │
│  [Switch Profile ▼]         │
│    • Startup (Active)       │
│    • Mentor                 │
│  [Add New Profile]          │
└─────────────────────────────┘
```

---

## What's Different from First Signup?

### First Signup (Creates Account):
- Creates auth account
- Creates first profile
- Sets password
- Email confirmation (if required)

### Adding Profile (After Login):
- ✅ Uses existing auth account (same email, same password)
- ✅ Creates additional profile
- ✅ No password needed (already logged in)
- ✅ No email confirmation needed
- ✅ New profile becomes active immediately

---

## Code Example (Simple)

```typescript
// When user clicks "Create Profile" button
const handleCreateProfile = async () => {
  // 1. Get form data
  const profileData = {
    name: "John Doe",
    role: "Startup",
    startupName: "My Tech Startup"
  };
  
  // 2. Call backend
  const result = await authService.createProfile(profileData);
  
  // 3. Handle result
  if (result.error) {
    alert(result.error); // Show error
  } else {
    // Success! Profile created
    // App will reload and show new profile
    window.location.reload();
  }
};
```

---

## Key Points

1. **Same Email**: All profiles use the same email address
2. **Same Password**: No new password needed
3. **Different Roles**: Each profile can have different role
4. **Separate Data**: Each profile has its own data
5. **Easy Switch**: Can switch between profiles anytime

---

## Common Questions

**Q: Can I have multiple Startup profiles?**
A: By default, no (one profile per role). But you can modify the constraint if needed.

**Q: What if I forget which profiles I have?**
A: Check the "Switch Profile" dropdown - it shows all your profiles.

**Q: Can I delete a profile?**
A: Yes, but you need at least one profile. You can't delete your last profile.

**Q: Do I need to verify email again?**
A: No, you're already logged in with verified email.

**Q: What happens to my old profile's data?**
A: It's safe! All data is stored separately per profile. You can switch back anytime.

---

That's it! Simple and straightforward. 🎯


