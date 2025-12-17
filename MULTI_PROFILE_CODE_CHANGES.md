# Multi-Profile System - Code Changes Required

## Overview
This document outlines all the code changes needed to implement the multi-profile system.

## 1. Update TypeScript Types

### Update `types.ts` or create new types file:

```typescript
// Add to existing types
export interface UserProfile {
  id: string;
  auth_user_id: string;
  email: string;
  name: string;
  role: UserRole;
  startup_name?: string;
  center_name?: string;
  firm_name?: string;
  investor_code?: string;
  investment_advisor_code?: string;
  investment_advisor_code_entered?: string;
  ca_code?: string;
  cs_code?: string;
  mentor_code?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  company?: string;
  company_type?: string;
  currency?: string;
  government_id?: string;
  ca_license?: string;
  cs_license?: string;
  verification_documents?: string[];
  profile_photo_url?: string;
  logo_url?: string;
  proof_of_business_url?: string;
  financial_advisor_license_url?: string;
  is_profile_complete?: boolean;
  registration_date: string;
  created_at: string;
  updated_at: string;
}

export interface UserProfileSession {
  auth_user_id: string;
  current_profile_id: string | null;
  updated_at: string;
}
```

## 2. Update `lib/auth.ts`

### Key Changes:
1. Replace `users` table queries with `user_profiles`
2. Use `get_current_profile()` function
3. Add profile switching methods
4. Update signup to create profiles

### Example Changes:

```typescript
// OLD: Get current user
async getCurrentUser(): Promise<AuthUser | null> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  
  const { data } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .maybeSingle()
  
  return data
}

// NEW: Get current active profile
async getCurrentUser(): Promise<AuthUser | null> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  
  // Use the helper function to get current profile
  const { data, error } = await supabase
    .rpc('get_current_profile', { auth_user_uuid: user.id })
    .single()
  
  if (error || !data) return null
  
  // Map to AuthUser interface
  return {
    id: data.profile_id,
    auth_user_id: data.auth_user_id,
    email: data.email,
    name: data.name,
    role: data.role,
    // ... map all other fields
  }
}

// NEW: Get all profiles for current user
async getUserProfiles(): Promise<UserProfile[]> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []
  
  const { data, error } = await supabase
    .rpc('get_user_profiles', { auth_user_uuid: user.id })
  
  if (error) {
    console.error('Error fetching user profiles:', error)
    return []
  }
  
  return data || []
}

// NEW: Switch active profile
async switchProfile(profileId: string): Promise<{ success: boolean; error?: string }> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'Not authenticated' }
  }
  
  const { data, error } = await supabase
    .rpc('switch_profile', {
      auth_user_uuid: user.id,
      profile_uuid: profileId
    })
  
  if (error) {
    console.error('Error switching profile:', error)
    return { success: false, error: error.message }
  }
  
  return { success: true }
}

// NEW: Create additional profile
async createProfile(profileData: {
  name: string;
  role: UserRole;
  startupName?: string;
  centerName?: string;
  firmName?: string;
  // ... other role-specific fields
}): Promise<{ profile: UserProfile | null; error: string | null }> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { profile: null, error: 'Not authenticated' }
  }
  
  // Check if user already has this role
  const { data: existing } = await supabase
    .from('user_profiles')
    .select('id')
    .eq('auth_user_id', user.id)
    .eq('role', profileData.role)
    .maybeSingle()
  
  if (existing) {
    return { profile: null, error: `You already have a ${profileData.role} profile` }
  }
  
  // Generate codes based on role
  const investorCode = profileData.role === 'Investor' ? generateInvestorCode() : null
  const investmentAdvisorCode = profileData.role === 'Investment Advisor' ? generateInvestmentAdvisorCode() : null
  
  // Create new profile
  const { data: newProfile, error } = await supabase
    .from('user_profiles')
    .insert({
      auth_user_id: user.id,
      email: user.email || '',
      name: profileData.name,
      role: profileData.role,
      startup_name: profileData.role === 'Startup' ? profileData.startupName : null,
      center_name: profileData.role === 'Startup Facilitation Center' ? profileData.centerName : null,
      firm_name: profileData.role === 'Investment Advisor' ? profileData.firmName : null,
      investor_code: investorCode,
      investment_advisor_code: investmentAdvisorCode,
      registration_date: new Date().toISOString().split('T')[0]
    })
    .select()
    .single()
  
  if (error) {
    return { profile: null, error: error.message }
  }
  
  // Set as active profile
  await this.switchProfile(newProfile.id)
  
  return { profile: newProfile, error: null }
}

// UPDATE: Signup to create profile instead of user
async signUp(data: SignUpData & { founders?: Founder[]; fileUrls?: { [key: string]: string } }): Promise<{ user: AuthUser | null; error: string | null; confirmationRequired: boolean }> {
  try {
    // Check if email exists in auth (but allow creating additional profiles)
    const { data: existingAuth } = await supabase.auth.admin.getUserByEmail(data.email)
    
    let authUserId: string
    
    if (existingAuth?.user) {
      // User exists, check if they already have this role
      const { data: existingProfile } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('auth_user_id', existingAuth.user.id)
        .eq('role', data.role)
        .maybeSingle()
      
      if (existingProfile) {
        return { user: null, error: `You already have a ${data.role} profile. Please sign in and switch to it.`, confirmationRequired: false }
      }
      
      authUserId = existingAuth.user.id
    } else {
      // Create new auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            name: data.name,
            role: data.role
          }
        }
      })
      
      if (authError || !authData.user) {
        return { user: null, error: authError?.message || 'Failed to create account', confirmationRequired: false }
      }
      
      authUserId = authData.user.id
      
      if (!authData.user.email_confirmed_at) {
        return { user: null, error: null, confirmationRequired: true }
      }
    }
    
    // Create profile
    const profileResult = await this.createProfile({
      name: data.name,
      role: data.role,
      startupName: data.startupName,
      centerName: data.centerName,
      firmName: data.firmName,
      // ... other fields
    })
    
    if (profileResult.error) {
      return { user: null, error: profileResult.error, confirmationRequired: false }
    }
    
    // Get the created profile as AuthUser
    const currentUser = await this.getCurrentUser()
    return { user: currentUser, error: null, confirmationRequired: false }
  } catch (error: any) {
    return { user: null, error: error.message, confirmationRequired: false }
  }
}
```

## 3. Create Profile Switching Component

### Create `components/ProfileSwitcher.tsx`:

```typescript
import React, { useState, useEffect } from 'react';
import { authService } from '../lib/auth';
import { UserProfile } from '../types';

interface ProfileSwitcherProps {
  onProfileSwitch?: (profile: UserProfile) => void;
}

export const ProfileSwitcher: React.FC<ProfileSwitcherProps> = ({ onProfileSwitch }) => {
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [currentProfile, setCurrentProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSwitching, setIsSwitching] = useState(false);

  useEffect(() => {
    loadProfiles();
  }, []);

  const loadProfiles = async () => {
    setIsLoading(true);
    try {
      const allProfiles = await authService.getUserProfiles();
      const current = await authService.getCurrentUser();
      
      setProfiles(allProfiles);
      setCurrentProfile(current);
    } catch (error) {
      console.error('Error loading profiles:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSwitchProfile = async (profileId: string) => {
    setIsSwitching(true);
    try {
      const result = await authService.switchProfile(profileId);
      if (result.success) {
        // Reload current user
        const newCurrent = await authService.getCurrentUser();
        setCurrentProfile(newCurrent);
        
        // Callback
        if (onProfileSwitch && newCurrent) {
          onProfileSwitch(newCurrent);
        }
        
        // Reload page or refresh data
        window.location.reload(); // Or use your state management
      } else {
        alert(result.error || 'Failed to switch profile');
      }
    } catch (error: any) {
      alert(error.message || 'Failed to switch profile');
    } finally {
      setIsSwitching(false);
    }
  };

  if (isLoading) {
    return <div>Loading profiles...</div>;
  }

  if (profiles.length <= 1) {
    return null; // Don't show if only one profile
  }

  return (
    <div className="profile-switcher">
      <h3>Switch Profile</h3>
      <div className="profiles-list">
        {profiles.map((profile) => (
          <div
            key={profile.id}
            className={`profile-item ${currentProfile?.id === profile.id ? 'active' : ''}`}
            onClick={() => handleSwitchProfile(profile.id)}
            style={{
              padding: '10px',
              margin: '5px 0',
              border: currentProfile?.id === profile.id ? '2px solid blue' : '1px solid gray',
              cursor: 'pointer',
              borderRadius: '4px'
            }}
          >
            <div><strong>{profile.name}</strong></div>
            <div>{profile.role}</div>
            {profile.startup_name && <div>Startup: {profile.startup_name}</div>}
            {currentProfile?.id === profile.id && <div>(Active)</div>}
          </div>
        ))}
      </div>
      {isSwitching && <div>Switching profile...</div>}
    </div>
  );
};
```

## 4. Create Add Profile Component

### Create `components/AddProfileModal.tsx`:

```typescript
import React, { useState } from 'react';
import { authService } from '../lib/auth';
import { UserRole } from '../types';

interface AddProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProfileCreated: () => void;
}

export const AddProfileModal: React.FC<AddProfileModalProps> = ({ isOpen, onClose, onProfileCreated }) => {
  const [role, setRole] = useState<UserRole>('Investor');
  const [name, setName] = useState('');
  const [startupName, setStartupName] = useState('');
  const [centerName, setCenterName] = useState('');
  const [firmName, setFirmName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const result = await authService.createProfile({
        name,
        role,
        startupName: role === 'Startup' ? startupName : undefined,
        centerName: role === 'Startup Facilitation Center' ? centerName : undefined,
        firmName: role === 'Investment Advisor' ? firmName : undefined,
      });

      if (result.error) {
        setError(result.error);
      } else {
        onProfileCreated();
        onClose();
        // Reset form
        setName('');
        setStartupName('');
        setCenterName('');
        setFirmName('');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create profile');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h2>Add New Profile</h2>
        <form onSubmit={handleSubmit}>
          <div>
            <label>Role:</label>
            <select value={role} onChange={(e) => setRole(e.target.value as UserRole)}>
              <option value="Investor">Investor</option>
              <option value="Startup">Startup</option>
              <option value="Mentor">Mentor</option>
              <option value="Investment Advisor">Investment Advisor</option>
              <option value="Startup Facilitation Center">Startup Facilitation Center</option>
              <option value="CA">CA</option>
              <option value="CS">CS</option>
            </select>
          </div>

          <div>
            <label>Name:</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          {role === 'Startup' && (
            <div>
              <label>Startup Name:</label>
              <input
                type="text"
                value={startupName}
                onChange={(e) => setStartupName(e.target.value)}
                required
              />
            </div>
          )}

          {role === 'Startup Facilitation Center' && (
            <div>
              <label>Center Name:</label>
              <input
                type="text"
                value={centerName}
                onChange={(e) => setCenterName(e.target.value)}
                required
              />
            </div>
          )}

          {role === 'Investment Advisor' && (
            <div>
              <label>Firm Name:</label>
              <input
                type="text"
                value={firmName}
                onChange={(e) => setFirmName(e.target.value)}
                required
              />
            </div>
          )}

          {error && <div className="error">{error}</div>}

          <div className="modal-actions">
            <button type="button" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create Profile'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
```

## 5. Update App.tsx

### Add Profile Switcher to your main app:

```typescript
// In App.tsx, add ProfileSwitcher component
import { ProfileSwitcher } from './components/ProfileSwitcher';
import { AddProfileModal } from './components/AddProfileModal';

// In your main component:
const [showAddProfile, setShowAddProfile] = useState(false);

// Add to your UI (maybe in a header or sidebar):
<ProfileSwitcher 
  onProfileSwitch={(profile) => {
    // Update current user state
    setCurrentUser(profile);
    // Reload data for new profile
    fetchData(true);
  }}
/>

<button onClick={() => setShowAddProfile(true)}>
  Add New Profile
</button>

<AddProfileModal
  isOpen={showAddProfile}
  onClose={() => setShowAddProfile(false)}
  onProfileCreated={() => {
    // Refresh profiles list
    window.location.reload(); // Or update state
  }}
/>
```

## 6. Update All Database Queries

### Important: Update all queries that reference `users.id` to use `user_profiles.id`

For example:
- `startups.user_id` → Should reference `user_profiles.id` (current active profile)
- All foreign keys need to be updated
- All RLS policies need to be updated

## 7. Migration Strategy

1. **Phase 1**: Run SQL migration script
2. **Phase 2**: Update backend code (auth.ts, database.ts)
3. **Phase 3**: Update frontend (add profile switcher UI)
4. **Phase 4**: Update all queries and foreign keys
5. **Phase 5**: Test thoroughly
6. **Phase 6**: (Optional) Deprecate old `users` table

## 8. Testing Checklist

- [ ] User can create multiple profiles with same email
- [ ] User can switch between profiles
- [ ] Each profile has separate data
- [ ] Profile switching updates UI correctly
- [ ] Existing users still work (migrated correctly)
- [ ] Signup flow works for new users
- [ ] Signup flow works for existing users adding new profile
- [ ] RLS policies work correctly
- [ ] All role-specific features work per profile


