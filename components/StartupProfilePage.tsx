import React, { useState, useEffect } from 'react';
import { ArrowLeft, User, Bell, HelpCircle, Edit3, Shield, RefreshCw, Building2 } from 'lucide-react';
import Button from './ui/Button';
import EditProfileModal from './EditProfileModal';
// PaymentSection removed
// SubscriptionSummaryCards removed
import { authService } from '../lib/auth';
import { AuthUser } from '../lib/auth';
import { Startup } from '../types';

interface StartupProfilePageProps {
  currentUser?: AuthUser | null;
  startup?: Startup;
  onBack: () => void;
  onProfileUpdate?: (updatedUser: AuthUser) => void;
}

const StartupProfilePage: React.FC<StartupProfilePageProps> = ({ 
  currentUser, 
  startup, 
  onBack, 
  onProfileUpdate
}) => {
  const [showEditModal, setShowEditModal] = useState(false);
  const [refreshedProfile, setRefreshedProfile] = useState<AuthUser | null>(currentUser);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Refresh profile data when component mounts only (not on every user change)
  useEffect(() => {
    if (currentUser?.id) {
      refreshProfileData();
    }
  }, []); // Empty dependency array - only run on mount

  // Function to refresh profile data from database
  const refreshProfileData = async () => {
    if (!currentUser?.id) return;
    
    try {
      setIsRefreshing(true);
      console.log('🔄 Refreshing startup profile data for user:', currentUser.id);
      
      const freshProfile = await authService.getCurrentUser();
      console.log('✅ Fresh startup profile data loaded:', freshProfile);
      
      // Update local state with fresh data
      setRefreshedProfile(freshProfile as AuthUser);
      
      // Only call onProfileUpdate if the data actually changed
      if (onProfileUpdate && JSON.stringify(freshProfile) !== JSON.stringify(currentUser)) {
        console.log('🔄 Startup profile data changed, updating parent component');
        onProfileUpdate(freshProfile as AuthUser);
      } else {
        console.log('✅ Startup profile data unchanged, no parent update needed');
      }
      
    } catch (error) {
      console.error('❌ Error refreshing startup profile data:', error);
      // Keep existing data if refresh fails
      setRefreshedProfile(currentUser);
    } finally {
      setIsRefreshing(false);
    }
  };

  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);

  const profileOptions = [
    {
      id: 'account',
      icon: <User className="h-5 w-5" />,
      title: 'Account',
      description: 'Manage your account settings',
      onClick: () => setShowEditModal(true)
    },
    {
      id: 'notifications',
      icon: <Bell className="h-5 w-5" />,
      title: 'Notifications',
      description: 'Manage notification preferences',
      onClick: () => setShowNotificationModal(true)
    },
    {
      id: 'help',
      icon: <HelpCircle className="h-5 w-5" />,
      title: 'Help & Support',
      description: 'Get help and contact support',
      onClick: () => setShowHelpModal(true)
    }
  ];


  const handleSaveProfile = async (updatedData: any) => {
    if (!currentUser?.id) {
      console.error('No user ID available');
      return;
    }

    try {
      console.log('Saving startup profile:', updatedData);
      
      // Update the currentUser state with all the new data
      if (onProfileUpdate) {
        const updatedUser = {
          ...currentUser,
          ...updatedData,
          // Ensure these specific fields are updated
          profile_photo_url: updatedData.profile_photo_url || currentUser.profile_photo_url,
          logo_url: updatedData.logo_url || currentUser.logo_url,
          name: updatedData.name || currentUser.name,
          phone: updatedData.phone || currentUser.phone,
          address: updatedData.address || currentUser.address,
          city: updatedData.city || currentUser.city,
          state: updatedData.state || currentUser.state,
          country: updatedData.country || currentUser.country,
          company: updatedData.company || currentUser.company,
        };
        
        console.log('✅ Startup profile updated, calling onProfileUpdate with:', updatedUser);
        onProfileUpdate(updatedUser);
      }
      
      console.log('Startup profile saved successfully!');
      
    } catch (error) {
      console.error('Error in handleSaveProfile:', error);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-blue-600 text-white">
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4">
          <button
            onClick={onBack}
            className="p-2 rounded-full hover:bg-blue-700 transition-colors"
            aria-label="Go back"
          >
            <ArrowLeft className="h-5 w-5 sm:h-6 sm:w-6" />
          </button>
          <h1 className="text-lg sm:text-xl font-semibold">Startup Profile</h1>
          <button
            onClick={refreshProfileData}
            disabled={isRefreshing}
            className="p-2 rounded-full hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Refresh profile data"
            title={isRefreshing ? "Refreshing..." : "Refresh profile data"}
          >
            <RefreshCw className={`h-5 w-5 sm:h-6 sm:w-6 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
        {/* Refresh Status */}
        {refreshedProfile && (
          <div className="text-xs text-blue-200 text-center pb-2">
            Last updated: {new Date().toLocaleTimeString()}
          </div>
        )}
      </div>

      {/* Profile Section */}
      <div className="bg-white px-4 sm:px-6 py-6 sm:py-8">
        <div className="flex flex-col items-center text-center">
          {/* Profile Picture */}
          <div className="relative mb-4 sm:mb-6">
            {refreshedProfile?.profile_photo_url ? (
              // Show uploaded profile photo
              <div className="w-20 h-20 sm:w-24 sm:h-24 lg:w-32 lg:h-32 rounded-full overflow-hidden border-4 border-blue-600">
                <img 
                  src={refreshedProfile.profile_photo_url} 
                  alt={`${refreshedProfile.name || 'User'}'s profile photo`}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    // Fallback to default avatar if image fails to load
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    target.nextElementSibling?.classList.remove('hidden');
                  }}
                />
                {/* Fallback avatar (hidden by default) */}
                <div className="w-full h-full bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white text-xl sm:text-2xl lg:text-3xl font-bold hidden">
                  {refreshedProfile?.name?.charAt(0)?.toUpperCase() || refreshedProfile?.email?.charAt(0)?.toUpperCase() || 'S'}
                </div>
              </div>
            ) : (
              // Show default avatar
              <div className="w-20 h-20 sm:w-24 sm:h-24 lg:w-32 lg:h-32 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white text-xl sm:text-2xl lg:text-3xl font-bold">
                {refreshedProfile?.name?.charAt(0)?.toUpperCase() || refreshedProfile?.email?.charAt(0)?.toUpperCase() || 'S'}
              </div>
            )}
            <button 
              className="absolute bottom-0 right-0 w-6 h-6 sm:w-8 sm:h-8 lg:w-10 lg:h-10 bg-blue-600 rounded-full flex items-center justify-center text-white hover:bg-blue-700 transition-colors"
              onClick={() => setShowEditModal(true)}
            >
              <Edit3 className="h-3 w-3 sm:h-4 sm:w-4 lg:h-5 lg:w-5" />
            </button>
          </div>

          {/* User Info */}
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-900 mb-2 sm:mb-3">
            {refreshedProfile?.name || refreshedProfile?.email?.split('@')[0] || 'Startup User'}
          </h2>
          <p className="text-sm sm:text-base text-slate-600 mb-3 sm:mb-4 break-all px-2">{refreshedProfile?.email}</p>
          
          {/* Role Badge */}
          <div className="flex flex-col sm:flex-row items-center gap-2 mb-3 sm:mb-4">
            <span className="text-xs sm:text-sm text-slate-500">Role:</span>
            <span className="bg-blue-100 text-blue-800 px-2 py-1 sm:px-3 sm:py-1 rounded-full text-xs sm:text-sm font-medium flex items-center gap-1">
              <Building2 className="h-3 w-3" />
              Startup
            </span>
          </div>

          {/* Company Info */}
          {refreshedProfile?.company && (
            <div className="flex flex-col sm:flex-row items-center gap-2 mb-4 sm:mb-6">
              <span className="text-xs sm:text-sm text-slate-500">Company:</span>
              <span className="bg-slate-100 text-slate-800 px-2 py-1 sm:px-3 sm:py-1 rounded-md text-xs sm:text-sm font-medium">
                {refreshedProfile.company}
              </span>
            </div>
          )}

          {/* Edit Profile Button */}
          <Button
            variant="primary"
            className="w-full max-w-xs sm:max-w-sm lg:max-w-md text-sm sm:text-base"
            onClick={() => setShowEditModal(true)}
          >
            Edit Profile
          </Button>
        </div>
      </div>

      {/* Verification Documents Section */}
      {(refreshedProfile?.government_id || refreshedProfile?.verification_documents && refreshedProfile.verification_documents.length > 0) && (
        <div className="bg-white mt-4 px-4 sm:px-6 py-6">
          <h3 className="text-base sm:text-lg font-medium text-slate-900 mb-4">Verification Documents</h3>
          <div className="space-y-3">
            {refreshedProfile?.government_id && (
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-md">
                <Shield className="h-5 w-5 text-green-600 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-green-800">Government ID</p>
                  <p className="text-xs text-green-600 break-all">{refreshedProfile.government_id}</p>
                </div>
                <button
                  onClick={() => window.open(refreshedProfile.government_id, '_blank')}
                  className="text-green-600 hover:text-green-800 text-sm underline flex-shrink-0"
                >
                  View
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Payment and Subscription components removed */}

      {/* Settings List */}
      <div className="bg-white mt-4">
        {profileOptions.map((option, index) => (
          <div key={option.id}>
            <button
              onClick={option.onClick}
              className="w-full px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="text-slate-600 flex-shrink-0">
                  {option.icon}
                </div>
                <div className="text-left min-w-0 flex-1">
                  <p className="text-sm sm:text-base font-medium text-slate-900">{option.title}</p>
                  <p className="text-xs sm:text-sm text-slate-500">{option.description}</p>
                </div>
              </div>
              <div className="text-slate-400 flex-shrink-0">
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </button>
            {index < profileOptions.length - 1 && (
              <div className="border-b border-slate-100 mx-4 sm:mx-6"></div>
            )}
          </div>
        ))}
      </div>


      {/* Edit Profile Modal */}
      <EditProfileModal
        currentUser={refreshedProfile}
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        onSave={handleSaveProfile}
      />

      {/* Notifications Modal */}
      {showNotificationModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="text-center">
              <Bell className="h-12 w-12 text-slate-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-900 mb-2">No Notifications</h3>
              <p className="text-slate-600 mb-6">You're all caught up! No new notifications at this time.</p>
              <Button
                variant="primary"
                onClick={() => setShowNotificationModal(false)}
                className="w-full"
              >
                Got it
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Help & Support Modal */}
      {showHelpModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="text-center">
              <HelpCircle className="h-12 w-12 text-blue-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Help & Support</h3>
              <p className="text-slate-600 mb-6">Our detailed help documentation and support system is coming soon. We're working hard to provide you with the best assistance.</p>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <p className="text-sm text-blue-800 font-medium">Coming Soon Features:</p>
                <ul className="text-sm text-blue-700 mt-2 space-y-1">
                  <li>• Comprehensive FAQ section</li>
                  <li>• Live chat support</li>
                  <li>• Video tutorials</li>
                  <li>• Contact support team</li>
                </ul>
              </div>
              <Button
                variant="primary"
                onClick={() => setShowHelpModal(false)}
                className="w-full"
              >
                Understood
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StartupProfilePage;
