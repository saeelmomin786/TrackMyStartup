import React, { useState, useEffect } from 'react';
import { authService } from '../lib/auth';
import { UserRole } from '../types';
import { ChevronDown, User, Building2, Briefcase, Users, GraduationCap } from 'lucide-react';

interface UserProfile {
  id: string;
  auth_user_id: string;
  email: string;
  name: string;
  role: UserRole;
  startup_name?: string;
  center_name?: string;
  firm_name?: string;
  is_profile_complete?: boolean;
  created_at: string;
}

interface ProfileSwitcherProps {
  onProfileSwitch?: (profile: UserProfile) => void;
  currentProfileId?: string;
}

const getRoleIcon = (role: UserRole) => {
  switch (role) {
    case 'Startup':
      return <Building2 className="h-4 w-4" />;
    case 'Investor':
      return <Briefcase className="h-4 w-4" />;
    case 'Mentor':
      return <GraduationCap className="h-4 w-4" />;
    case 'Investment Advisor':
      return <Briefcase className="h-4 w-4" />;
    case 'Startup Facilitation Center':
      return <Users className="h-4 w-4" />;
    default:
      return <User className="h-4 w-4" />;
  }
};

export const ProfileSwitcher: React.FC<ProfileSwitcherProps> = ({ 
  onProfileSwitch, 
  currentProfileId 
}) => {
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [currentProfile, setCurrentProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSwitching, setIsSwitching] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    loadProfiles();
  }, []);

  const loadProfiles = async () => {
    setIsLoading(true);
    try {
      const allProfiles = await authService.getUserProfiles();
      const current = await authService.getCurrentUser();
      
      setProfiles(allProfiles);
      if (current) {
        const matchingProfile = allProfiles.find(p => p.id === current.id) || allProfiles[0];
        setCurrentProfile(matchingProfile);
      }
    } catch (error) {
      console.error('Error loading profiles:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSwitchProfile = async (profileId: string) => {
    if (profileId === currentProfile?.id) {
      setIsOpen(false);
      return;
    }

    setIsSwitching(true);
    try {
      console.log('🔄 Switching to profile:', profileId);
      const result = await authService.switchProfile(profileId);
      
      if (result.success) {
        console.log('✅ Profile switch successful');
        
        // Get the profile that was switched to
        const switchedProfile = profiles.find(p => p.id === profileId);
        if (!switchedProfile) {
          console.error('❌ Switched profile not found in list');
          alert('Profile not found');
          setIsSwitching(false);
          return;
        }
        
        setCurrentProfile(switchedProfile);
        setIsOpen(false);
        
        // Callback to parent (App.tsx) - this will handle updating currentUser and checking completion
        if (onProfileSwitch) {
          console.log('🔄 Calling onProfileSwitch callback with profile:', switchedProfile.role);
          onProfileSwitch(switchedProfile);
        } else {
          // If no callback, reload page as fallback
          console.log('🔄 No callback, reloading page');
          window.location.reload();
        }
      } else {
        console.error('❌ Profile switch failed:', result.error);
        alert(result.error || 'Failed to switch profile');
        setIsSwitching(false);
      }
    } catch (error: any) {
      console.error('❌ Error switching profile:', error);
      alert(error.message || 'Failed to switch profile');
      setIsSwitching(false);
    }
  };

  if (isLoading) {
    return (
      <div className="px-4 py-2 text-sm text-slate-600">
        Loading profiles...
      </div>
    );
  }

  if (profiles.length <= 1) {
    return null; // Don't show if only one profile
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-4 py-2 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-brand-primary"
        disabled={isSwitching}
      >
        {currentProfile && (
          <>
            <span className="text-slate-700">
              {getRoleIcon(currentProfile.role)}
            </span>
            <span className="text-sm font-medium text-slate-900">
              {currentProfile.name}
            </span>
            <span className="text-xs text-slate-500">
              ({currentProfile.role})
            </span>
          </>
        )}
        <ChevronDown className={`h-4 w-4 text-slate-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-slate-200 z-20">
            <div className="p-2">
              <div className="px-3 py-2 text-xs font-semibold text-slate-500 uppercase">
                Switch Profile
              </div>
              {profiles.map((profile) => (
                <button
                  key={profile.id}
                  onClick={() => handleSwitchProfile(profile.id)}
                  disabled={isSwitching || profile.id === currentProfile?.id}
                  className={`w-full flex items-center space-x-3 px-3 py-2 rounded-md text-left transition-colors ${
                    profile.id === currentProfile?.id
                      ? 'bg-brand-primary/10 text-brand-primary'
                      : 'hover:bg-slate-50 text-slate-700'
                  } ${isSwitching ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <span className="text-slate-600">
                    {getRoleIcon(profile.role)}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">
                      {profile.name}
                    </div>
                    <div className="text-xs text-slate-500 truncate">
                      {profile.role}
                      {profile.startup_name && ` • ${profile.startup_name}`}
                      {profile.firm_name && ` • ${profile.firm_name}`}
                    </div>
                  </div>
                  {profile.id === currentProfile?.id && (
                    <span className="text-xs text-brand-primary font-medium">
                      Active
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};


