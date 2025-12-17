import React, { useState } from 'react';
import { BasicRegistrationStep } from './BasicRegistrationStep';
import { CompleteRegistrationPage } from './CompleteRegistrationPage';
import { X } from 'lucide-react';
import { authService } from '../lib/auth';

interface AddProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProfileCreated: () => void;
}

export const AddProfileModal: React.FC<AddProfileModalProps> = ({ 
  isOpen, 
  onClose, 
  onProfileCreated 
}) => {
  const [currentStep, setCurrentStep] = useState<'form1' | 'form2'>('form1');
  const [form1Data, setForm1Data] = useState<any>(null);
  const [newProfileId, setNewProfileId] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleForm1Complete = (userData: {
    name: string;
    email: string;
    password: string;
    role: any;
    startupName?: string;
    centerName?: string;
    firmName?: string;
    investmentAdvisorCode?: string;
    profileId?: string; // NEW: Profile ID from Form 1
  }) => {
    setForm1Data(userData);
    if (userData.profileId) {
      setNewProfileId(userData.profileId);
    }
    setCurrentStep('form2');
  };

  const handleForm2Complete = () => {
    // Profile created successfully
    onProfileCreated();
    onClose();
    // Reset state
    setCurrentStep('form1');
    setForm1Data(null);
    // Reload page to show new profile
    window.location.reload();
  };

  const handleBack = () => {
    if (currentStep === 'form2') {
      setCurrentStep('form1');
      setForm1Data(null);
    } else {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" style={{ zIndex: 9999 }}>
      {/* Background overlay */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={handleBack}
        style={{ zIndex: 9998 }}
      />

      {/* Modal panel */}
      <div 
        className="fixed inset-0 flex items-center justify-center p-4"
        style={{ zIndex: 9999 }}
        onClick={(e) => {
          // Close if clicking outside modal content
          if (e.target === e.currentTarget) {
            handleBack();
          }
        }}
      >
        <div 
          className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto relative"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="sticky top-0 bg-white border-b border-slate-200 px-4 sm:px-6 py-4 flex items-center justify-between z-10">
            <h3 className="text-lg font-semibold text-slate-900">
              {currentStep === 'form1' ? 'Add New Profile' : 'Complete Profile Details'}
            </h3>
            <button
              onClick={handleBack}
              className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded hover:bg-slate-100"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-4 sm:p-6">
            {currentStep === 'form1' ? (
              <BasicRegistrationStep
                isAddingProfile={true}
                onEmailVerified={handleForm1Complete}
                onNavigateToLogin={() => {}}
              />
            ) : (
              <CompleteRegistrationPage
                onNavigateToRegister={() => setCurrentStep('form1')}
                onNavigateToDashboard={async () => {
                  // After Form 2 completes, switch to the new profile
                  if (newProfileId) {
                    console.log('🔄 Switching to newly created profile:', newProfileId);
                    const switchResult = await authService.switchProfile(newProfileId);
                    if (switchResult.success) {
                      console.log('✅ Successfully switched to new profile');
                    } else {
                      console.error('❌ Failed to switch profile:', switchResult.error);
                    }
                  }
                  handleForm2Complete();
                }}
                newProfileId={newProfileId || undefined} // Pass profile ID to Form 2
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};


