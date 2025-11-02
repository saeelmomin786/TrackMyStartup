import React, { useState, useRef } from 'react';
import { X, Camera, User, Mail, Phone, MapPin, Calendar, Building, Shield, Save, Edit3, Trash2 } from 'lucide-react';
import Button from './ui/Button';
import CloudDriveInput from './ui/CloudDriveInput';
import { authService } from '../lib/auth';
import { AuthUser } from '../lib/auth';
import { supabase } from '../lib/supabase';
import { storageService } from '../lib/storage';

interface EditProfileModalProps {
  currentUser?: AuthUser | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedData: any) => void;
}

const EditProfileModal: React.FC<EditProfileModalProps> = ({ 
  currentUser, 
  isOpen, 
  onClose, 
  onSave 
}) => {
  const [formData, setFormData] = useState({
    name: currentUser?.name || '',
    email: currentUser?.email || '',
    phone: currentUser?.phone || '',
    address: currentUser?.address || '',
    city: currentUser?.city || '',
    state: currentUser?.state || '',
    country: currentUser?.country || '',
    company: currentUser?.company || currentUser?.startup_name || '',
    government_id: currentUser?.government_id || '',
    ca_license: currentUser?.ca_license || '',
    // Investment Advisor specific fields
    investor_code: currentUser?.investor_code || '',
    investment_advisor_code: currentUser?.investment_advisor_code || '',
    investment_advisor_code_entered: currentUser?.investment_advisor_code_entered || '',
    logo_url: currentUser?.logo_url || '',
    financial_advisor_license_url: currentUser?.financial_advisor_license_url || '',
  });

  // Debug logging for form initialization
  React.useEffect(() => {
    console.log('🔍 EditProfileModal - Form data initialized:', {
      currentUser: currentUser,
      investment_advisor_code_entered: currentUser?.investment_advisor_code_entered,
      formData: formData
    });
  }, [currentUser, formData]);
  
  const [profilePhoto, setProfilePhoto] = useState<string | null>(currentUser?.profile_photo_url || null);

  const [currentDocuments, setCurrentDocuments] = useState<{
    government_id?: string;
    ca_license?: string;
    logo_url?: string;
    financial_advisor_license_url?: string;
  }>({
    government_id: currentUser?.government_id,
    ca_license: currentUser?.ca_license,
    logo_url: currentUser?.logo_url,
    financial_advisor_license_url: currentUser?.financial_advisor_license_url,
  });
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const govIdRef = useRef<HTMLInputElement>(null);
  const caLicenseRef = useRef<HTMLInputElement>(null);
  const csLicenseRef = useRef<HTMLInputElement>(null);
  const logoRef = useRef<HTMLInputElement>(null);
  const financialLicenseRef = useRef<HTMLInputElement>(null);


  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    console.log('🔍 handlePhotoUpload called with:', {
      hasFile: !!file,
      fileName: file?.name,
      fileType: file?.type,
      fileSize: file?.size,
      hasCurrentUser: !!currentUser,
      currentUserId: currentUser?.id
    });
    
    if (!file) {
      console.error('❌ No file selected');
      alert('No file selected. Please select a file and try again.');
      return;
    }
    
    if (!currentUser?.id) {
      console.error('❌ No user ID available');
      alert('User not authenticated. Please refresh the page and try again.');
      return;
    }
    
    try {
      setIsLoading(true);
      console.log('🔄 Starting profile photo upload...');
      
      // Use the new replaceProfilePhoto method for better management
      const oldPhotoUrl = currentUser?.profile_photo_url;
      console.log('🔄 Calling replaceProfilePhoto with:', {
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        userId: currentUser.id,
        oldPhotoUrl
      });
      
      const result = await storageService.replaceProfilePhoto(file, currentUser.id, oldPhotoUrl);
      
      console.log('📤 Storage service result:', result);
      
      if (!result.success) {
        throw new Error(result.error || 'Upload failed');
      }
      
      if (!result.url) {
        throw new Error('No URL returned from upload service');
      }
      
      // Update local state
      setProfilePhoto(result.url);
      setFormData(prev => ({
        ...prev,
        profile_photo_url: result.url
      }));
      
      console.log('✅ Profile photo replaced successfully:', result.url);
      
      // Call onSave to update parent component
      onSave({
        ...currentUser,
        profile_photo_url: result.url
      });
      
      alert('Profile photo uploaded successfully!');
      
    } catch (error: any) {
      console.error('❌ Error uploading profile photo:', error);
      console.error('❌ Error details:', {
        message: error?.message,
        stack: error?.stack,
        name: error?.name
      });
      const errorMessage = error?.message || 'Failed to upload profile photo. Please try again.';
      alert(`Error: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGovernmentIdUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && currentUser?.id) {
      try {
        setIsLoading(true);
        // Use the new replaceVerificationDocument method for better management
        const oldUrl = currentDocuments.government_id;
        const result = await storageService.replaceVerificationDocument(file, currentUser.id, 'government-id', oldUrl);
        setFormData(prev => ({
          ...prev,
          government_id: result.url
        }));
        setCurrentDocuments(prev => ({
          ...prev,
          government_id: result.url
        }));
        console.log('✅ Government ID replaced successfully:', result.url);
      } catch (error) {
        console.error('❌ Error uploading government ID:', error);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleCALicenseUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && currentUser?.id) {
      try {
        setIsLoading(true);
        // Use the new replaceVerificationDocument method for better management
        const oldUrl = currentDocuments.ca_license;
        const result = await storageService.replaceVerificationDocument(file, currentUser.id, 'ca-license', oldUrl);
        setFormData(prev => ({
          ...prev,
          ca_license: result.url
        }));
        setCurrentDocuments(prev => ({
          ...prev,
          ca_license: result.url
        }));
        console.log('✅ CA License replaced successfully:', result.url);
      } catch (error) {
        console.error('❌ Error uploading CA license:', error);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleCSLicenseUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && currentUser?.id) {
      try {
        setIsLoading(true);
        // Use the new replaceVerificationDocument method for better management
        // CS licenses are stored in ca_license field (existing working system)
        const oldUrl = currentDocuments.ca_license;
        const result = await storageService.replaceVerificationDocument(file, currentUser.id, 'cs-license', oldUrl);
        setFormData(prev => ({
          ...prev,
          ca_license: result.url
        }));
        setCurrentDocuments(prev => ({
          ...prev,
          ca_license: result.url
        }));
        console.log('✅ CS License replaced successfully:', result.url);
      } catch (error) {
        console.error('❌ Error uploading CS license:', error);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && currentUser?.id) {
      try {
        setIsLoading(true);
        const oldUrl = currentDocuments.logo_url;
        const result = await storageService.replaceVerificationDocument(file, currentUser.id, 'logo', oldUrl);
        
        // Update local state
        setFormData(prev => ({
          ...prev,
          logo_url: result.url
        }));
        setCurrentDocuments(prev => ({
          ...prev,
          logo_url: result.url
        }));
        
        console.log('✅ Logo replaced successfully:', result.url);
        
        // Immediately save logo_url to database
        try {
          const updateResult = await authService.updateProfile(currentUser.id, {
            logo_url: result.url
          });
          
          if (updateResult.error) {
            console.error('❌ Error saving logo to database:', updateResult.error);
          } else {
            console.log('✅ Logo saved to database successfully');
            
            // Notify parent component of the update
            onSave({
              ...currentUser,
              logo_url: result.url
            });
          }
        } catch (dbError) {
          console.error('❌ Error updating profile with logo:', dbError);
        }
        
      } catch (error) {
        console.error('❌ Error uploading logo:', error);
        alert('Failed to upload logo. Please try again.');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleFinancialLicenseUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && currentUser?.id) {
      try {
        setIsLoading(true);
        const oldUrl = currentDocuments.financial_advisor_license_url;
        const result = await storageService.replaceVerificationDocument(file, currentUser.id, 'financial-license', oldUrl);
        setFormData(prev => ({
          ...prev,
          financial_advisor_license_url: result.url
        }));
        setCurrentDocuments(prev => ({
          ...prev,
          financial_advisor_license_url: result.url
        }));
        console.log('✅ Financial Advisor License replaced successfully:', result.url);
      } catch (error) {
        console.error('❌ Error uploading financial advisor license:', error);
      } finally {
        setIsLoading(false);
      }
    }
  };


  const handleSave = async () => {
    if (!currentUser?.id) {
      console.error('No user ID available');
      return;
    }

    setIsLoading(true);
    try {
      // Prepare profile data for update
      const profileData = {
        name: formData.name,
        phone: formData.phone,
        address: formData.address,
        city: formData.city,
        state: formData.state,
        country: formData.country,
        company: formData.company,
        company_type: formData.company_type,
        government_id: formData.government_id,
        ca_license: formData.ca_license,
        profile_photo_url: profilePhoto || formData.profile_photo_url,
        investment_advisor_code_entered: formData.investment_advisor_code_entered,
        logo_url: formData.logo_url,
        financial_advisor_license_url: formData.financial_advisor_license_url,
      };

      // Update profile in database using authService
      const updateResult = await authService.updateProfile(currentUser.id, profileData);
      if (updateResult.error) {
        throw new Error(updateResult.error);
      }

      // If user is a startup, also update the startups table with startup-specific fields
      if (currentUser.role === 'Startup') {
        try {
          // Import the profileService to update startup profile
          const { profileService } = await import('../lib/profileService');
          
          // Get the startup ID from the current user
          const { data: startupData, error: startupError } = await supabase
            .from('startups')
            .select('id')
            .eq('user_id', currentUser.id)
            .single();

          if (startupError) {
            console.error('Error finding startup for user:', startupError);
          } else if (startupData && startupData.id) {
            // Prepare startup profile data
            const startupProfileData: any = {};
            
            // Add investment advisor code if provided
            if (formData.investment_advisor_code_entered) {
              startupProfileData.investmentAdvisorCode = formData.investment_advisor_code_entered;
            }
            
            // Add company name if provided
            if (formData.company) {
              startupProfileData.name = formData.company;
            }
            
            // Add company type if provided
            if (formData.company_type) {
              startupProfileData.companyType = formData.company_type;
            }
            
            // Only update if there's data to update
            if (Object.keys(startupProfileData).length > 0) {
              await profileService.updateStartupProfile(startupData.id, startupProfileData);
              console.log('✅ Startup profile updated with:', startupProfileData);
            }
          }
        } catch (error) {
          console.error('Error updating startup profile:', error);
        }
      }

      // Call onSave with updated data
      const updatedData = {
        ...profileData,
        profilePhoto,
        profile_photo_url: formData.profile_photo_url,
        // Include all form data to ensure UI updates properly
        name: formData.name,
        phone: formData.phone,
        address: formData.address,
        city: formData.city,
        state: formData.state,
        country: formData.country,
        company: formData.company,
        investment_advisor_code_entered: formData.investment_advisor_code_entered,
        logo_url: formData.logo_url,
        financial_advisor_license_url: formData.financial_advisor_license_url,
      };
      
      await onSave(updatedData);
      onClose();
    } catch (error) {
      console.error('Error saving profile:', error);
      // You might want to show a user-friendly error message here
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4 lg:p-6">
      <div className="bg-white rounded-lg w-full max-w-xs sm:max-w-lg md:max-w-2xl lg:max-w-4xl xl:max-w-5xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-3 sm:p-4 md:p-6 border-b border-slate-200 flex-shrink-0">
          <h2 className="text-base sm:text-lg md:text-xl lg:text-2xl font-semibold text-slate-900">Edit Profile</h2>
          <button
            onClick={onClose}
            className="p-1.5 sm:p-2 rounded-full hover:bg-slate-100 transition-colors"
          >
            <X className="h-4 w-4 sm:h-5 sm:w-5 text-slate-600" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6 space-y-3 sm:space-y-4 md:space-y-6">
          {/* Profile Photo Section */}
          <div className="flex flex-col items-center space-y-2 sm:space-y-3 md:space-y-4">
            <div className="relative">
              <div className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 lg:w-32 lg:h-32 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center text-white text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold overflow-hidden">
                {profilePhoto ? (
                  <img 
                    src={profilePhoto} 
                    alt="Profile" 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  currentUser?.name?.charAt(0)?.toUpperCase() || 
                  currentUser?.email?.charAt(0)?.toUpperCase() || 'U'
                )}
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-0 right-0 w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8 lg:w-10 lg:h-10 bg-green-600 rounded-full flex items-center justify-center text-white hover:bg-green-700 transition-colors"
              >
                <Camera className="h-2.5 w-2.5 sm:h-3 sm:w-3 md:h-4 md:w-4 lg:h-5 lg:w-5" />
              </button>
            </div>
            <CloudDriveInput
              value=""
              onChange={(url) => {
                const hiddenInput = document.getElementById('profile-photo-url') as HTMLInputElement;
                if (hiddenInput) hiddenInput.value = url;
              }}
              onFileSelect={(file) => {
                console.log('📤 Profile photo onFileSelect called with file:', file);
                // Create a proper synthetic event with FileList
                const dataTransfer = new DataTransfer();
                dataTransfer.items.add(file);
                const syntheticEvent = {
                  target: {
                    files: dataTransfer.files
                  }
                } as React.ChangeEvent<HTMLInputElement>;
                console.log('🔄 Calling handlePhotoUpload with synthetic event');
                handlePhotoUpload(syntheticEvent);
              }}
              placeholder="Paste your cloud drive link here..."
              label=""
              accept="image/*"
              maxSize={5}
              documentType="profile photo"
              showPrivacyMessage={false}
              className="w-full text-sm"
            />
            <input 
              type="file"
              ref={fileInputRef}
              onChange={handlePhotoUpload}
              accept="image/*"
              className="hidden"
              id="profile-photo-input"
            />
            <input type="hidden" id="profile-photo-url" name="profile-photo-url" />
            <p className="text-xs sm:text-sm text-slate-500 text-center px-2">
              Click the camera icon to upload a new photo
            </p>
          </div>

          {/* Basic Information */}
          <div className="space-y-3 sm:space-y-4">
            <h3 className="text-sm sm:text-base md:text-lg font-medium text-slate-900 border-b border-slate-200 pb-2">
              Basic Information
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 md:gap-4">
              <div>
                <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-1 sm:mb-2">
                  Full Name *
                </label>
                <div className="relative">
                  <User className="absolute left-2 sm:left-3 top-1/2 transform -translate-y-1/2 h-3 w-3 sm:h-4 sm:w-4 text-slate-400" />
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    className="w-full pl-7 sm:pl-10 pr-2 sm:pr-3 py-1.5 sm:py-2 text-sm sm:text-base border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="Enter your full name"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-1 sm:mb-2">
                  Email *
                </label>
                <div className="relative">
                  <Mail className="absolute left-2 sm:left-3 top-1/2 transform -translate-y-1/2 h-3 w-3 sm:h-4 sm:w-4 text-slate-400" />
                  <input
                    type="email"
                    value={formData.email}
                    disabled
                    className="w-full pl-7 sm:pl-10 pr-2 sm:pr-3 py-1.5 sm:py-2 text-sm sm:text-base border border-slate-300 rounded-md bg-slate-50 text-slate-500 cursor-not-allowed"
                  />
                  <p className="text-xs text-slate-500 mt-1">Email cannot be changed</p>
                </div>
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-1 sm:mb-2">
                  Phone Number
                </label>
                <div className="relative">
                  <Phone className="absolute left-2 sm:left-3 top-1/2 transform -translate-y-1/2 h-3 w-3 sm:h-4 sm:w-4 text-slate-400" />
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    className="w-full pl-7 sm:pl-10 pr-2 sm:pr-3 py-1.5 sm:py-2 text-sm sm:text-base border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="Enter phone number"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-1 sm:mb-2">
                  Company/Startup Name
                </label>
                <div className="relative">
                  <Building className="absolute left-2 sm:left-3 top-1/2 transform -translate-y-1/2 h-3 w-3 sm:h-4 sm:w-4 text-slate-400" />
                  <input
                    type="text"
                    value={formData.company || currentUser?.startup_name || ''}
                    onChange={(e) => handleInputChange('company', e.target.value)}
                    className="w-full pl-7 sm:pl-10 pr-2 sm:pr-3 py-1.5 sm:py-2 text-sm sm:text-base border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="Enter your startup/company name"
                  />
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  This is the name you entered during registration
                </p>
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-1 sm:mb-2">
                  Company Type
                </label>
                <div className="relative">
                  <Building className="absolute left-2 sm:left-3 top-1/2 transform -translate-y-1/2 h-3 w-3 sm:h-4 sm:w-4 text-slate-400" />
                  <input
                    type="text"
                    value={currentUser?.company_type || 'Not specified'}
                    disabled
                    className="w-full pl-7 sm:pl-10 pr-2 sm:pr-3 py-1.5 sm:py-2 text-sm sm:text-base border border-slate-300 rounded-md bg-slate-50 text-slate-500 cursor-not-allowed"
                  />
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Company type selected during registration (cannot be changed)
                </p>
              </div>

            </div>
          </div>

          {/* Address Information */}
          <div className="space-y-3 sm:space-y-4">
            <h3 className="text-sm sm:text-base md:text-lg font-medium text-slate-900 border-b border-slate-200 pb-2">
              Address Information
            </h3>
            
            <div className="space-y-3 sm:space-y-4">
              <div>
                <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-1 sm:mb-2">
                  Street Address
                </label>
                <div className="relative">
                  <MapPin className="absolute left-2 sm:left-3 top-1/2 transform -translate-y-1/2 h-3 w-3 sm:h-4 sm:w-4 text-slate-400" />
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => handleInputChange('address', e.target.value)}
                    className="w-full pl-7 sm:pl-10 pr-2 sm:pr-3 py-1.5 sm:py-2 text-sm sm:text-base border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="Enter street address"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 sm:gap-3 md:gap-4">
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-1 sm:mb-2">
                    City
                  </label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => handleInputChange('city', e.target.value)}
                    className="w-full px-2 sm:px-3 py-1.5 sm:py-2 text-sm sm:text-base border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="City"
                  />
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-1 sm:mb-2">
                    State/Province
                  </label>
                  <input
                    type="text"
                    value={formData.state}
                    onChange={(e) => handleInputChange('state', e.target.value)}
                    className="w-full px-2 sm:px-3 py-1.5 sm:py-2 text-sm sm:text-base border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="State"
                  />
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-1 sm:mb-2">
                    Country
                  </label>
                  <input
                    type="text"
                    value={formData.country}
                    onChange={(e) => handleInputChange('country', e.target.value)}
                    className="w-full px-2 sm:px-3 py-1.5 sm:py-2 text-sm sm:text-base border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="Country"
                  />
                </div>
              </div>
            </div>
          </div>


          {/* Verification Documents */}
          <div className="space-y-3 sm:space-y-4">
            <h3 className="text-sm sm:text-base md:text-lg font-medium text-slate-900 border-b border-slate-200 pb-2">
              Verification Documents
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-1 sm:mb-2">
                  Government ID (Passport, Driver's License, etc.)
                </label>
                <div className="space-y-2 sm:space-y-3">
                  {/* Show existing document if available */}
                  {currentDocuments.government_id && (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between p-2 sm:p-3 bg-green-50 border border-green-200 rounded-md gap-2 sm:gap-3">
                      <div className="flex items-center gap-2 sm:gap-3">
                        <Shield className="h-4 w-4 sm:h-5 sm:w-5 text-green-600 flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                          <span className="text-xs sm:text-sm text-green-800 font-medium block">
                            Current Document: {currentDocuments.government_id.split('/').pop() || currentDocuments.government_id}
                          </span>
                        </div>
                        <button
                          onClick={() => window.open(currentDocuments.government_id, '_blank')}
                          className="text-green-600 hover:text-green-800 text-xs sm:text-sm underline flex-shrink-0"
                        >
                          View Document
                        </button>
                      </div>
                      <button
                        onClick={() => {
                          setFormData(prev => ({ ...prev, government_id: '' }));
                          setCurrentDocuments(prev => ({ ...prev, government_id: '' }));
                        }}
                        className="text-red-500 hover:text-red-700 text-xs sm:text-sm px-2 py-1 rounded hover:bg-red-50 self-end sm:self-center"
                        title="Remove Document"
                      >
                        <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                      </button>
                    </div>
                  )}
                  
                  {/* Upload new document */}
                  <div className="flex items-center gap-2 sm:gap-3">
                    <CloudDriveInput
                      value=""
                      onChange={(url) => {
                        const hiddenInput = document.getElementById('gov-id-url') as HTMLInputElement;
                        if (hiddenInput) hiddenInput.value = url;
                      }}
                      onFileSelect={(file) => {
                        const fileInput = govIdRef.current;
                        if (fileInput) {
                          const dataTransfer = new DataTransfer();
                          dataTransfer.items.add(file);
                          fileInput.files = dataTransfer.files;
                          handleGovernmentIdUpload({ target: { files: [file] } } as any);
                        }
                      }}
                      placeholder="Paste your cloud drive link here..."
                      label=""
                      accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                      maxSize={10}
                      documentType="government ID"
                      showPrivacyMessage={false}
                      className="w-full text-sm"
                    />
                    <input type="hidden" id="gov-id-url" name="gov-id-url" />
                    <button
                      onClick={() => govIdRef.current?.click()}
                      className="px-3 sm:px-4 py-1.5 sm:py-2 border border-slate-300 rounded-md text-xs sm:text-sm text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-2"
                    >
                      <Shield className="h-3 w-3 sm:h-4 sm:w-4" />
                      {currentDocuments.government_id ? 'Replace Document' : 'Upload Document'}
                    </button>
                  </div>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Accepted formats: PDF, JPG, PNG, DOC, DOCX
                </p>
              </div>

                            {/* CA License Section - Only show for CA users */}
              {currentUser?.role === 'CA' && (
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-1 sm:mb-2">
                    Copy of CA License
                  </label>
                  <div className="space-y-2 sm:space-y-3">
                    {/* Show existing document if available */}
                    {currentDocuments.ca_license && (
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between p-2 sm:p-3 bg-green-50 border border-green-200 rounded-md gap-2 sm:gap-3">
                        <div className="flex items-center gap-2 sm:gap-3">
                          <Shield className="h-4 w-4 sm:h-5 sm:w-5 text-green-600 flex-shrink-0" />
                          <div className="min-w-0 flex-1">
                            <span className="text-xs sm:text-sm text-green-800 font-medium block">
                              Current Document: {currentDocuments.ca_license.split('/').pop() || currentDocuments.ca_license}
                            </span>
                          </div>
                          <button
                            onClick={() => window.open(currentDocuments.ca_license, '_blank')}
                            className="text-green-600 hover:text-green-800 text-xs sm:text-sm underline flex-shrink-0"
                          >
                            View Document
                          </button>
                        </div>
                        <button
                          onClick={() => {
                            setFormData(prev => ({ ...prev, ca_license: '' }));
                            setCurrentDocuments(prev => ({ ...prev, ca_license: '' }));
                          }}
                          className="text-red-500 hover:text-red-700 text-xs sm:text-sm px-2 py-1 rounded hover:bg-red-50 self-end sm:self-center"
                          title="Remove Document"
                        >
                          <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                        </button>
                      </div>
                    )}
                    
                    {/* Upload new document */}
                    <div className="flex items-center gap-2 sm:gap-3">
                      <CloudDriveInput
                        value=""
                        onChange={(url) => {
                          const hiddenInput = document.getElementById('ca-license-url') as HTMLInputElement;
                          if (hiddenInput) hiddenInput.value = url;
                        }}
                        onFileSelect={(file) => {
                          const fileInput = caLicenseRef.current;
                          if (fileInput) {
                            const dataTransfer = new DataTransfer();
                            dataTransfer.items.add(file);
                            fileInput.files = dataTransfer.files;
                            handleCALicenseUpload({ target: { files: [file] } } as any);
                          }
                        }}
                        placeholder="Paste your cloud drive link here..."
                        label=""
                        accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                        maxSize={10}
                        documentType="CA license"
                        showPrivacyMessage={false}
                        className="w-full"
                      />
                      <input type="hidden" id="ca-license-url" name="ca-license-url" />
                      <button
                        onClick={() => caLicenseRef.current?.click()}
                        className="px-3 sm:px-4 py-1.5 sm:py-2 border border-slate-300 rounded-md text-xs sm:text-sm text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-2"
                      >
                        <Shield className="h-3 w-3 sm:h-4 sm:w-4" />
                        {currentDocuments.ca_license ? 'Replace Document' : 'Upload Document'}
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Accepted formats: PDF, JPG, PNG, DOC, DOCX
                  </p>
                </div>
              )}

              {/* CS License Section - Only show for CS users */}
              {currentUser?.role === 'CS' && (
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-1 sm:mb-2">
                    Copy of CS License
                  </label>
                  <div className="space-y-2 sm:space-y-3">
                    {/* Show existing document if available */}
                    {currentDocuments.ca_license && (
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between p-2 sm:p-3 bg-green-50 border border-green-200 rounded-md gap-2 sm:gap-3">
                        <div className="flex items-center gap-2 sm:gap-3">
                          <Shield className="h-4 w-4 sm:h-5 sm:w-5 text-green-600 flex-shrink-0" />
                          <div className="min-w-0 flex-1">
                            <span className="text-xs sm:text-sm text-green-800 font-medium block">
                              Current Document: {currentDocuments.ca_license.split('/').pop() || currentDocuments.ca_license}
                            </span>
                          </div>
                          <button
                            onClick={() => window.open(currentDocuments.ca_license, '_blank')}
                            className="text-green-600 hover:text-green-800 text-xs sm:text-sm underline flex-shrink-0"
                          >
                            View Document
                          </button>
                        </div>
                        <button
                          onClick={() => {
                            setFormData(prev => ({ ...prev, ca_license: '' }));
                            setCurrentDocuments(prev => ({ ...prev, ca_license: '' }));
                          }}
                          className="text-red-500 hover:text-red-700 text-xs sm:text-sm px-2 py-1 rounded hover:bg-red-50 self-end sm:self-center"
                          title="Remove Document"
                        >
                          <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                        </button>
                      </div>
                    )}
                    
                    {/* Upload new document */}
                    <div className="flex items-center gap-2 sm:gap-3">
                      <CloudDriveInput
                        value=""
                        onChange={(url) => {
                          const hiddenInput = document.getElementById('cs-license-url') as HTMLInputElement;
                          if (hiddenInput) hiddenInput.value = url;
                        }}
                        onFileSelect={(file) => {
                          const fileInput = csLicenseRef.current;
                          if (fileInput) {
                            const dataTransfer = new DataTransfer();
                            dataTransfer.items.add(file);
                            fileInput.files = dataTransfer.files;
                            handleCSLicenseUpload({ target: { files: [file] } } as any);
                          }
                        }}
                        placeholder="Paste your cloud drive link here..."
                        label=""
                        accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                        maxSize={10}
                        documentType="CS license"
                        showPrivacyMessage={false}
                        className="w-full"
                      />
                      <input type="hidden" id="cs-license-url" name="cs-license-url" />
                      <button
                        onClick={() => csLicenseRef.current?.click()}
                        className="px-3 sm:px-4 py-1.5 sm:py-2 border border-slate-300 rounded-md text-xs sm:text-sm text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-2"
                      >
                        <Shield className="h-3 w-3 sm:h-4 sm:w-4" />
                        {currentDocuments.ca_license ? 'Replace Document' : 'Upload Document'}
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Accepted formats: PDF, JPG, PNG, DOC, DOCX
                  </p>
                </div>
              )}

              {/* Investment Advisor Code Section - Only show for Investment Advisor users */}
              {currentUser?.role === 'Investment Advisor' && (
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-1 sm:mb-2">
                    Investment Advisor Code
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={formData.investment_advisor_code}
                      onChange={(e) => handleInputChange('investment_advisor_code', e.target.value)}
                      className="flex-1 px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="IA-XXXXXX"
                      readOnly
                    />
                    <span className="text-xs text-slate-500">Auto-generated</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Your unique Investment Advisor code (read-only)
                  </p>
                </div>
              )}

              {/* Investment Advisor Code Entry Section - Only show for Investor and Startup users */}
              {(currentUser?.role === 'Investor' || currentUser?.role === 'Startup') && (
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-1 sm:mb-2">
                    Investment Advisor Code
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={formData.investment_advisor_code_entered}
                      onChange={(e) => {
                        console.log('🔍 Investment Advisor Code changed:', e.target.value);
                        handleInputChange('investment_advisor_code_entered', e.target.value);
                      }}
                      className="flex-1 px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="IA-XXXXXX"
                    />
                    <span className="text-xs text-slate-500">Optional</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Enter your Investment Advisor's code to connect with them
                  </p>
                  <p className="text-xs text-blue-600 mt-1">
                    Current value: {formData.investment_advisor_code_entered || 'None'}
                  </p>
                </div>
              )}

              {/* Logo Section - Only show for Investment Advisor users */}
              {(() => {
                const isInvestmentAdvisor = 
                  currentUser?.role === 'Investment Advisor' ||
                  currentUser?.role?.toLowerCase() === 'investment advisor' ||
                  !!currentUser?.investment_advisor_code ||
                  (currentUser?.investment_advisor_code && currentUser.investment_advisor_code.startsWith('IA-'));
                
                console.log('🔍 EditProfileModal - Logo Section Check:', {
                  currentUserRole: currentUser?.role,
                  currentUserInvestmentAdvisorCode: currentUser?.investment_advisor_code,
                  isInvestmentAdvisor
                });
                
                return isInvestmentAdvisor;
              })() && (
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-1 sm:mb-2">
                    Company Logo
                  </label>
                  <div className="space-y-2 sm:space-y-3">
                    {/* Show existing logo if available */}
                    {currentDocuments.logo_url && (
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between p-2 sm:p-3 bg-green-50 border border-green-200 rounded-md gap-2 sm:gap-3">
                        <div className="flex items-center gap-2 sm:gap-3">
                          <img 
                            src={currentDocuments.logo_url} 
                            alt="Current Logo" 
                            className="h-8 w-8 rounded object-cover"
                          />
                          <div className="min-w-0 flex-1">
                            <span className="text-xs sm:text-sm text-green-800 font-medium block">
                              Current Logo: {currentDocuments.logo_url.split('/').pop() || 'Company Logo'}
                            </span>
                          </div>
                          <button
                            onClick={() => window.open(currentDocuments.logo_url, '_blank')}
                            className="text-green-600 hover:text-green-800 text-xs sm:text-sm underline flex-shrink-0"
                          >
                            View Logo
                          </button>
                        </div>
                        <button
                          onClick={() => {
                            setFormData(prev => ({ ...prev, logo_url: '' }));
                            setCurrentDocuments(prev => ({ ...prev, logo_url: '' }));
                          }}
                          className="text-red-500 hover:text-red-700 text-xs sm:text-sm px-2 py-1 rounded hover:bg-red-50 self-end sm:self-center"
                          title="Remove Logo"
                        >
                          <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                        </button>
                      </div>
                    )}
                    
                    {/* Upload new logo */}
                    <div className="flex items-center gap-2 sm:gap-3">
                      <CloudDriveInput
                        value=""
                        onChange={(url) => {
                          const hiddenInput = document.getElementById('logo-url') as HTMLInputElement;
                          if (hiddenInput) hiddenInput.value = url;
                        }}
                        onFileSelect={(file) => {
                          const fileInput = logoRef.current;
                          if (fileInput) {
                            const dataTransfer = new DataTransfer();
                            dataTransfer.items.add(file);
                            fileInput.files = dataTransfer.files;
                            handleLogoUpload({ target: { files: [file] } } as any);
                          }
                        }}
                        placeholder="Paste your cloud drive link here..."
                        label=""
                        accept=".jpg,.jpeg,.png,.svg"
                        maxSize={5}
                        documentType="company logo"
                        showPrivacyMessage={false}
                        className="w-full"
                      />
                      <input 
                        type="file"
                        ref={logoRef}
                        onChange={handleLogoUpload}
                        accept=".jpg,.jpeg,.png,.svg"
                        className="hidden"
                        id="logo-file-input"
                      />
                      <input type="hidden" id="logo-url" name="logo-url" />
                      <button
                        onClick={() => logoRef.current?.click()}
                        disabled={isLoading}
                        className="px-3 sm:px-4 py-1.5 sm:py-2 border border-slate-300 rounded-md text-xs sm:text-sm text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Camera className="h-3 w-3 sm:h-4 sm:w-4" />
                        {isLoading ? 'Uploading...' : (currentDocuments.logo_url ? 'Replace Logo' : 'Upload Logo')}
                      </button>
                    </div>
                  </div>
                  <div className="text-xs text-slate-500 mt-1 space-y-1">
                    <p>Accepted formats: JPG, PNG, SVG</p>
                    <div className="bg-blue-50 p-2 rounded border border-blue-200">
                      <p className="font-medium text-blue-800 mb-1">Logo Specifications:</p>
                      <ul className="text-blue-700 space-y-0.5">
                        <li>• Recommended size: 64x64 pixels (square format)</li>
                        <li>• Maximum file size: 5MB</li>
                        <li>• Logo will be displayed as 64x64px with white background</li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {/* Financial Advisor License Section - Only show for Investment Advisor users */}
              {currentUser?.role === 'Investment Advisor' && (
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-1 sm:mb-2">
                    Financial Advisor License
                  </label>
                  <div className="space-y-2 sm:space-y-3">
                    {/* Show existing document if available */}
                    {currentDocuments.financial_advisor_license_url && (
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between p-2 sm:p-3 bg-green-50 border border-green-200 rounded-md gap-2 sm:gap-3">
                        <div className="flex items-center gap-2 sm:gap-3">
                          <Shield className="h-4 w-4 sm:h-5 sm:w-5 text-green-600 flex-shrink-0" />
                          <div className="min-w-0 flex-1">
                            <span className="text-xs sm:text-sm text-green-800 font-medium block">
                              Current Document: {currentDocuments.financial_advisor_license_url.split('/').pop() || currentDocuments.financial_advisor_license_url}
                            </span>
                          </div>
                          <button
                            onClick={() => window.open(currentDocuments.financial_advisor_license_url, '_blank')}
                            className="text-green-600 hover:text-green-800 text-xs sm:text-sm underline flex-shrink-0"
                          >
                            View Document
                          </button>
                        </div>
                        <button
                          onClick={() => {
                            setFormData(prev => ({ ...prev, financial_advisor_license_url: '' }));
                            setCurrentDocuments(prev => ({ ...prev, financial_advisor_license_url: '' }));
                          }}
                          className="text-red-500 hover:text-red-700 text-xs sm:text-sm px-2 py-1 rounded hover:bg-red-50 self-end sm:self-center"
                          title="Remove Document"
                        >
                          <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                        </button>
                      </div>
                    )}
                    
                    {/* Upload new document */}
                    <div className="flex items-center gap-2 sm:gap-3">
                      <CloudDriveInput
                        value=""
                        onChange={(url) => {
                          const hiddenInput = document.getElementById('financial-license-url') as HTMLInputElement;
                          if (hiddenInput) hiddenInput.value = url;
                        }}
                        onFileSelect={(file) => {
                          const fileInput = financialLicenseRef.current;
                          if (fileInput) {
                            const dataTransfer = new DataTransfer();
                            dataTransfer.items.add(file);
                            fileInput.files = dataTransfer.files;
                            handleFinancialLicenseUpload({ target: { files: [file] } } as any);
                          }
                        }}
                        placeholder="Paste your cloud drive link here..."
                        label=""
                        accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                        maxSize={10}
                        documentType="financial license"
                        showPrivacyMessage={false}
                        className="w-full"
                      />
                      <input type="hidden" id="financial-license-url" name="financial-license-url" />
                      <button
                        onClick={() => financialLicenseRef.current?.click()}
                        className="px-3 sm:px-4 py-1.5 sm:py-2 border border-slate-300 rounded-md text-xs sm:text-sm text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-2"
                      >
                        <Shield className="h-3 w-3 sm:h-4 sm:w-4" />
                        {currentDocuments.financial_advisor_license_url ? 'Replace Document' : 'Upload Document'}
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Upload your financial advisor license (if applicable)
                  </p>
                </div>
              )}


            </div>
          </div>
        </div>

        {/* Sticky Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-end gap-2 sm:gap-3 p-3 sm:p-4 md:p-6 border-t border-slate-200 bg-white flex-shrink-0">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
            className="w-full sm:w-auto text-sm sm:text-base px-3 sm:px-4 py-2 sm:py-2.5"
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSave}
            disabled={isLoading}
            className="w-full sm:w-auto flex items-center gap-2 text-sm sm:text-base px-3 sm:px-4 py-2 sm:py-2.5"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-3 w-3 sm:h-4 sm:w-4 border-b-2 border-white"></div>
                <span className="hidden sm:inline">Saving...</span>
                <span className="sm:hidden">Save</span>
              </>
            ) : (
              <>
                <Save className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Save Changes</span>
                <span className="sm:hidden">Save</span>
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default EditProfileModal;
