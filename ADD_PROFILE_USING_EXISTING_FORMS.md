# Adding Profile Using Existing Registration Forms

## Answer: YES - Reuse the Same Forms!

You should **reuse your existing registration forms** (BasicRegistrationStep and CompleteRegistrationPage) but with **small modifications** to skip email/password since the user is already logged in.

---

## Current Registration Flow

### Form 1: BasicRegistrationStep
**Collects:**
- Name
- Email
- Password
- Confirm Password
- Role
- Role-specific fields (Startup Name, Firm Name, etc.)
- Investment Advisor Code (if applicable)

### Form 2: CompleteRegistrationPage
**Collects:**
- Verification Documents (Government ID, Role-specific docs)
- Founders (for Startup role)
- Profile Information (Country, Company Type, etc.)
- Compliance details
- Additional role-specific data

---

## Modified Flow for Adding Profile

### Form 1: BasicRegistrationStep (Modified)
**For Existing Users (Adding Profile):**
- ✅ **Skip**: Email (use current user's email)
- ✅ **Skip**: Password (already logged in)
- ✅ **Skip**: Confirm Password
- ✅ **Keep**: Name (for this profile)
- ✅ **Keep**: Role (select new role)
- ✅ **Keep**: Role-specific fields (Startup Name, Firm Name, etc.)
- ✅ **Keep**: Investment Advisor Code (if applicable)

### Form 2: CompleteRegistrationPage (Same)
**No Changes Needed!**
- ✅ Verification Documents
- ✅ Founders (if Startup)
- ✅ Profile Information
- ✅ Compliance details
- ✅ All other fields

---

## Implementation Strategy

### Option 1: Create Separate Component (Recommended)
Create a new component `AddProfileForm.tsx` that reuses the same form logic but skips email/password.

### Option 2: Modify Existing Component
Add a prop to `BasicRegistrationStep` to indicate if it's for adding a profile (skip email/password).

---

## Code Example: Modified BasicRegistrationStep

```typescript
interface BasicRegistrationStepProps {
  onEmailVerified: (userData: {
    name: string;
    email: string;
    password: string;
    role: UserRole;
    startupName?: string;
    centerName?: string;
    firmName?: string;
    investmentAdvisorCode?: string;
  }) => void;
  onNavigateToLogin: () => void;
  onNavigateToLanding?: () => void;
  // NEW: Add this prop
  isAddingProfile?: boolean; // If true, skip email/password
}

export const BasicRegistrationStep: React.FC<BasicRegistrationStepProps> = ({
  onEmailVerified,
  onNavigateToLogin,
  onNavigateToLanding,
  isAddingProfile = false // Default to false for normal registration
}) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'Investor' as UserRole,
    startupName: '',
    centerName: '',
    firmName: '',
    investmentAdvisorCode: ''
  });

  // Get current user if adding profile
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  
  useEffect(() => {
    if (isAddingProfile) {
      // Get current logged-in user
      authService.getCurrentUser().then(user => {
        if (user) {
          setCurrentUser(user);
          setFormData(prev => ({
            ...prev,
            email: user.email // Pre-fill email
          }));
        }
      });
    }
  }, [isAddingProfile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    // SKIP email/password validation if adding profile
    if (!isAddingProfile) {
      // Normal registration validation
      if (emailValidation.exists) {
        setError('This email is already registered. Please sign in instead.');
        setIsLoading(false);
        return;
      }

      if (formData.password !== formData.confirmPassword) {
        setError('Passwords do not match');
        setIsLoading(false);
        return;
      }
    }

    // Role-specific validation (same for both)
    if (formData.role === 'Startup' && !formData.startupName.trim()) {
      setError('Startup name is required for Startup role');
      setIsLoading(false);
      return;
    }

    // ... rest of validation

    if (isAddingProfile) {
      // CREATE PROFILE (not signup)
      const result = await authService.createProfile({
        name: formData.name,
        role: formData.role,
        startupName: formData.startupName,
        centerName: formData.centerName,
        firmName: formData.firmName,
        investmentAdvisorCode: formData.investmentAdvisorCode
      });

      if (result.error) {
        setError(result.error);
        setIsLoading(false);
        return;
      }

      // Proceed to Form 2 (CompleteRegistrationPage)
      onEmailVerified({
        name: formData.name,
        email: currentUser?.email || '',
        password: '', // Not needed
        role: formData.role,
        startupName: formData.startupName,
        centerName: formData.centerName,
        firmName: formData.firmName,
        investmentAdvisorCode: formData.investmentAdvisorCode
      });
    } else {
      // Normal registration flow (existing code)
      // ... OTP verification, signup, etc.
    }
  };

  return (
    <Card>
      <h2>{isAddingProfile ? 'Add New Profile' : 'Create a new account'}</h2>
      
      <form onSubmit={handleSubmit}>
        {/* SKIP email/password fields if adding profile */}
        {!isAddingProfile && (
          <>
            <Input 
              label="Email address"
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              required
            />
            <Input 
              label="Password"
              type="password"
              value={formData.password}
              onChange={(e) => handleInputChange('password', e.target.value)}
              required
            />
            <Input 
              label="Confirm Password"
              type="password"
              value={formData.confirmPassword}
              onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
              required
            />
          </>
        )}

        {/* Show current email if adding profile */}
        {isAddingProfile && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-700">
              Email (Your Account)
            </label>
            <div className="mt-1 text-sm text-slate-600 bg-slate-50 p-2 rounded">
              {currentUser?.email}
            </div>
            <p className="mt-1 text-xs text-slate-500">
              This profile will be added to your existing account
            </p>
          </div>
        )}

        {/* Name field (always shown) */}
        <Input 
          label="Full Name"
          type="text"
          value={formData.name}
          onChange={(e) => handleInputChange('name', e.target.value)}
          required
        />

        {/* Role selection (always shown) */}
        <Select
          label="Role"
          value={formData.role}
          onChange={(e) => handleInputChange('role', e.target.value)}
          options={availableRoles.map(r => ({ value: r, label: r }))}
          required
        />

        {/* Role-specific fields (always shown) */}
        {formData.role === 'Startup' && (
          <Input
            label="Startup Name"
            value={formData.startupName}
            onChange={(e) => handleInputChange('startupName', e.target.value)}
            required
          />
        )}

        {/* ... other role-specific fields ... */}

        <Button type="submit" isLoading={isLoading}>
          {isAddingProfile ? 'Continue to Profile Details' : 'Continue'}
        </Button>
      </form>
    </Card>
  );
};
```

---

## Code Example: Modified CompleteRegistrationPage

**No changes needed!** But you can add a prop to show it's for a new profile:

```typescript
interface CompleteRegistrationPageProps {
  onNavigateToRegister: () => void;
  onNavigateToDashboard: () => void;
  // NEW: Optional prop
  isAddingProfile?: boolean;
  newProfileId?: string; // The newly created profile ID
}

export const CompleteRegistrationPage: React.FC<CompleteRegistrationPageProps> = ({
  onNavigateToRegister,
  onNavigateToDashboard,
  isAddingProfile = false,
  newProfileId
}) => {
  // ... existing code ...

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // ... collect all form data ...

    if (isAddingProfile && newProfileId) {
      // Update the newly created profile with Form 2 data
      await authService.updateProfile(newProfileId, {
        // ... all Form 2 data ...
        government_id: cloudDriveUrls.govId,
        // ... etc
      });
    } else {
      // Normal registration flow (existing code)
      // ... create user, upload documents, etc.
    }

    // Navigate to dashboard
    onNavigateToDashboard();
  };

  return (
    <Card>
      <h2>
        {isAddingProfile 
          ? 'Complete Your New Profile' 
          : 'Complete Your Registration'}
      </h2>
      
      {/* Rest of the form - NO CHANGES NEEDED */}
      {/* All fields work the same way */}
    </Card>
  );
};
```

---

## Complete Flow for Adding Profile

### Step 1: User Clicks "Add New Profile"
```typescript
const handleAddProfile = () => {
  setShowAddProfileModal(true);
  setCurrentStep('basic'); // Start with Form 1
};
```

### Step 2: Show Modified Form 1
```typescript
<BasicRegistrationStep
  isAddingProfile={true} // ← Key prop!
  onEmailVerified={(data) => {
    // Save profile data temporarily
    setNewProfileData(data);
    setCurrentStep('documents'); // Go to Form 2
  }}
  onNavigateToLogin={() => {}}
/>
```

### Step 3: Show Form 2 (Same as Registration)
```typescript
<CompleteRegistrationPage
  isAddingProfile={true} // ← Key prop!
  newProfileId={newProfileId} // The profile created in Form 1
  onNavigateToDashboard={() => {
    // Refresh profiles, switch to new profile
    loadProfiles();
    switchToNewProfile(newProfileId);
  }}
/>
```

---

## Key Points

### ✅ What Stays the Same
- **Form 2 (CompleteRegistrationPage)**: No changes needed!
- **All validation logic**: Same
- **Document upload**: Same
- **Founders section**: Same (for Startup)
- **Compliance fields**: Same
- **All role-specific fields**: Same

### 🔄 What Changes
- **Form 1**: Skip email/password fields
- **Form 1**: Pre-fill email from current user
- **Form 1**: Create profile instead of signup
- **Form 2**: Update existing profile instead of creating user

### 📋 Summary

| Field | Registration | Adding Profile |
|-------|-------------|----------------|
| Email | ✅ Required | ❌ Skip (use current) |
| Password | ✅ Required | ❌ Skip (already logged in) |
| Name | ✅ Required | ✅ Required |
| Role | ✅ Required | ✅ Required |
| Role-specific fields | ✅ Required | ✅ Required |
| Form 2 (Documents) | ✅ Required | ✅ Required (same) |
| Form 2 (Founders) | ✅ Required | ✅ Required (same) |
| Form 2 (Profile Info) | ✅ Required | ✅ Required (same) |

---

## Benefits of Reusing Forms

1. ✅ **Consistency**: Same UX for registration and adding profiles
2. ✅ **Less Code**: Reuse existing validation and logic
3. ✅ **Same Data**: Collects all the same information
4. ✅ **Easy Maintenance**: One place to update forms
5. ✅ **User Familiarity**: Users know what to expect

---

## Implementation Checklist

- [ ] Add `isAddingProfile` prop to `BasicRegistrationStep`
- [ ] Skip email/password fields when `isAddingProfile={true}`
- [ ] Pre-fill email from current user
- [ ] Change submit handler to create profile instead of signup
- [ ] Add `isAddingProfile` prop to `CompleteRegistrationPage` (optional)
- [ ] Update Form 2 submit to update profile instead of create user
- [ ] Test complete flow: Add Profile → Form 1 → Form 2 → Dashboard
- [ ] Verify all data is saved correctly
- [ ] Test with different roles

---

**Bottom Line**: Yes, reuse the same forms! Just skip email/password in Form 1 when adding a profile. Form 2 stays exactly the same! 🎯


