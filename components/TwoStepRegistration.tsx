import React, { useState } from 'react';
import { BasicRegistrationStep } from './BasicRegistrationStep';
import { DocumentUploadStep } from './DocumentUploadStep';
import { UserRole } from '../types';
import StartupPaymentStep from './StartupPaymentStep';
import StartupSubscriptionStep from './StartupSubscriptionStep';
import { authService, AuthUser } from '../lib/auth';
import { storageService } from '../lib/storage';

// Helper function to get currency based on country
const getCurrencyForCountry = (country: string): string => {
  const currencyMap: { [key: string]: string } = {
    'United States': 'USD',
    'India': 'INR',
    'United Kingdom': 'GBP',
    'Canada': 'CAD',
    'Australia': 'AUD',
    'Germany': 'EUR',
    'France': 'EUR',
    'Singapore': 'SGD',
    'Japan': 'JPY',
    'China': 'CNY',
    'Brazil': 'BRL',
    'Mexico': 'MXN',
    'South Africa': 'ZAR',
    'Nigeria': 'NGN',
    'Kenya': 'KES',
    'Egypt': 'EGP',
    'UAE': 'AED',
    'Saudi Arabia': 'SAR',
    'Israel': 'ILS'
  };
  return currencyMap[country] || 'USD';
};

interface TwoStepRegistrationProps {
  onRegister: (user: any, founders: any[], startupName?: string, country?: string) => void;
  onNavigateToLogin: () => void;
  onNavigateToLanding?: () => void;
}

export const TwoStepRegistration: React.FC<TwoStepRegistrationProps> = ({
  onRegister,
  onNavigateToLogin,
  onNavigateToLanding
}) => {
  const [currentStep, setCurrentStep] = useState<'basic' | 'documents' | 'payment'>('basic');
  const [pendingDocuments, setPendingDocuments] = useState<any | null>(null);
  const [pendingFounders, setPendingFounders] = useState<any[] | null>(null);
  const [pendingCountry, setPendingCountry] = useState<string | undefined>(undefined);
  const [userData, setUserData] = useState<{
    name: string;
    email: string;
    password: string;
    role: UserRole;
    startupName?: string;
    country: string;
    investmentAdvisorCode?: string;
  } | null>(() => {
    // Try to restore data from localStorage
    const saved = localStorage.getItem('registrationData');
    if (saved) {
      const data = JSON.parse(saved);
      // If we have saved data, start at documents step
      setCurrentStep('documents');
      return data;
    }
    return null;
  });

  const handleEmailVerified = (data: {
    name: string;
    email: string;
    password: string;
    role: UserRole;
    startupName?: string;
  }) => {
    // Save data to localStorage
    localStorage.setItem('registrationData', JSON.stringify(data));
    setUserData(data);
    setCurrentStep('documents');
  };

  const handleBackToBasic = () => {
    setCurrentStep('basic');
    setUserData(null);
    // Clear saved data when going back
    localStorage.removeItem('registrationData');
  };

  const handleComplete = async (
    userData: any, 
    documents: any, 
    founders: any[],
    country?: string
  ) => {
    // For Startup role, go to payment step first (₹1 verification)
    if (userData?.role === 'Startup') {
      // Cache payload to finalize after payment success
      setPendingDocuments(documents);
      setPendingFounders(founders);
      setPendingCountry(country);
      try {
        localStorage.setItem('startupPaymentRequired', '1');
      } catch {}
      setCurrentStep('payment');
      return;
    }

    // Non-startup roles proceed to finalize directly
    await finalizeRegistration(userData, documents, founders, country);
  };

  const finalizeRegistration = async (
    userData: any, 
    documents: any, 
    founders: any[],
    country?: string
  ) => {
    try {
      
      // Upload documents to storage in parallel for better performance
      const uploadPromises = [];
      
      if (documents.govId) {
        uploadPromises.push(
          storageService.uploadVerificationDocument(
            documents.govId, 
            userData.email, 
            'government-id'
          ).then(result => ({ type: 'govId', result }))
        );
      }

      if (documents.roleSpecific) {
        const roleDocType = getRoleSpecificDocumentType(userData.role);
        uploadPromises.push(
          storageService.uploadVerificationDocument(
            documents.roleSpecific, 
            userData.email, 
            roleDocType
          ).then(result => ({ type: 'roleSpecific', result }))
        );
      }

      // Upload license for Investment Advisors
      if (documents.license && userData.role === 'Investment Advisor') {
        uploadPromises.push(
          storageService.uploadVerificationDocument(
            documents.license, 
            userData.email, 
            'financial-advisor-license'
          ).then(result => ({ type: 'license', result }))
        );
      }

      // Upload logo for Investment Advisors
      if (documents.logo && userData.role === 'Investment Advisor') {
        uploadPromises.push(
          storageService.uploadVerificationDocument(
            documents.logo, 
            userData.email, 
            'company-logo'
          ).then(result => ({ type: 'logo', result }))
        );
      }

      console.log(`📤 Uploading ${uploadPromises.length} files in parallel...`);
      
      // Wait for all uploads to complete in parallel
      const uploadResults = await Promise.all(uploadPromises);
      
      // Process upload results
      let governmentIdUrl = '';
      let roleSpecificUrl = '';
      let licenseUrl = '';
      let logoUrl = '';

      uploadResults.forEach(({ type, result }) => {
        if (result.success && result.url) {
          switch (type) {
            case 'govId':
              governmentIdUrl = result.url;
              break;
            case 'roleSpecific':
              roleSpecificUrl = result.url;
              break;
            case 'license':
              licenseUrl = result.url;
              break;
            case 'logo':
              logoUrl = result.url;
              break;
          }
        }
      });

      console.log('✅ All file uploads completed');

      // Get current user to update their profile
      const { data: { user }, error: userError } = await authService.supabase.auth.getUser();
      
      if (userError || !user) {
        throw new Error('User not authenticated');
      }

      // Update user profile with documents, country, and other data
      const updateData: any = {
        government_id: governmentIdUrl,
        ca_license: roleSpecificUrl,
        verification_documents: [governmentIdUrl, roleSpecificUrl].filter(Boolean),
        country: country, // Save country from second stage
        updated_at: new Date().toISOString()
      };

      // Add Investment Advisor specific fields
      if (userData.role === 'Investment Advisor') {
        if (licenseUrl) {
          updateData.financial_advisor_license_url = licenseUrl;
        }
        if (logoUrl) {
          updateData.logo_url = logoUrl;
        }
        // Add license and logo to verification documents
        updateData.verification_documents = [governmentIdUrl, roleSpecificUrl, licenseUrl, logoUrl].filter(Boolean);
      }

      // Add Investment Advisor code if provided
      if (investmentAdvisorCode && investmentAdvisorCode.trim()) {
        updateData.investment_advisor_code = investmentAdvisorCode.trim();
      }

      console.log('Updating user profile with data:', updateData);
      console.log('User ID:', user.id);

      const { data: updatedProfile, error: updateError } = await authService.supabase
        .from('users')
        .update(updateData)
        .eq('id', user.id)
        .select()
        .single();

      if (updateError) {
        console.error('Update error:', updateError);
        throw new Error(`Failed to update user profile: ${updateError.message}`);
      }

      // If user is a startup, ensure startup and founders are created
      if (userData.role === 'Startup') {
        try {
          console.log('🏢 Setting up startup and founders...');
          
          // Use upsert to create or update startup in one operation
          const startupData: any = {
            name: userData.startupName || `${userData.name}'s Startup`,
            investment_type: 'Seed',
            investment_value: 0,
            equity_allocation: 0,
            current_valuation: 0,
            compliance_status: 'Pending',
            sector: 'Technology',
            total_funding: 0,
            total_revenue: 0,
            registration_date: new Date().toISOString().split('T')[0],
            user_id: user.id,
            country_of_registration: country, // Save country to startup
            currency: getCurrencyForCountry(country) // Set currency based on country
          };

          // Add Investment Advisor code if provided
          if (investmentAdvisorCode && investmentAdvisorCode.trim()) {
            startupData.investment_advisor_code = investmentAdvisorCode.trim();
          }

          // Use upsert to handle both create and update cases
          const { data: startupResult, error: startupError } = await authService.supabase
            .from('startups')
            .upsert(startupData, { 
              onConflict: 'name',
              ignoreDuplicates: false 
            })
            .select()
            .single();

          if (startupError) {
            console.error('Startup upsert error:', startupError);
            throw new Error(`Failed to create/update startup: ${startupError.message}`);
          }

          const startupId = startupResult?.id;
          console.log('✅ Startup created/updated:', startupId);

          // Add founders if startup exists and founders provided
          if (startupId && founders.length > 0) {
            console.log(`👥 Adding ${founders.length} founders...`);
            
            const foundersData = founders.map(founder => ({
              startup_id: startupId,
              name: founder.name,
              email: founder.email,
              equity_percentage: founder.equity || 0
            }));

            const { error: foundersError } = await authService.supabase
              .from('founders')
              .upsert(foundersData, { 
                onConflict: 'startup_id,email',
                ignoreDuplicates: false 
              });

            if (foundersError) {
              console.error('Founders upsert error:', foundersError);
              throw new Error(`Failed to create/update founders: ${foundersError.message}`);
            }
            
            console.log('✅ Founders added successfully');
          }
        } catch (error) {
          console.error('Error handling startup/founders:', error);
          throw error; // Re-throw to prevent silent failures
        }
      }

      // Create AuthUser object for the callback
      const authUser: AuthUser = {
        id: updatedProfile.id,
        email: updatedProfile.email,
        name: updatedProfile.name,
        role: updatedProfile.role,
        startup_name: updatedProfile.startup_name,
        investor_code: updatedProfile.investor_code,
        ca_code: updatedProfile.ca_code,
        cs_code: updatedProfile.cs_code,
        registration_date: updatedProfile.registration_date,
        phone: updatedProfile.phone,
        address: updatedProfile.address,
        city: updatedProfile.city,
        state: updatedProfile.state,
        country: updatedProfile.country,
        company: updatedProfile.company,
        government_id: updatedProfile.government_id,
        ca_license: updatedProfile.ca_license,
        verification_documents: updatedProfile.verification_documents,
        profile_photo_url: updatedProfile.profile_photo_url,
        is_profile_complete: true,
        // Investment Advisor specific fields
        investment_advisor_code: updatedProfile.investment_advisor_code,
        logo_url: updatedProfile.logo_url,
        proof_of_business_url: updatedProfile.proof_of_business_url,
        financial_advisor_license_url: updatedProfile.financial_advisor_license_url
      };

      // Registration successful
      onRegister(
        authUser, 
        userData.role === 'Startup' ? founders : [], 
        userData.role === 'Startup' ? userData.startupName : undefined,
        country
      );

    } catch (error: any) {
      console.error('Registration error:', error);
      // Handle error appropriately
      throw error;
    }
  };

  const getRoleSpecificDocumentType = (role: UserRole): string => {
    switch (role) {
      case 'Investor': return 'pan-card';
      case 'Startup': return 'company-registration';
      case 'CA': return 'ca-license';
      case 'CS': return 'cs-license';
      case 'Startup Facilitation Center': return 'org-registration';
      case 'Investment Advisor': return 'financial-advisor-license';
      default: return 'document';
    }
  };

  if (currentStep === 'documents' && userData) {
    return (
      <DocumentUploadStep
        userData={userData}
        onComplete={handleComplete}
        onBack={handleBackToBasic}
      />
    );
  }

  if (currentStep === 'payment' && userData) {
    // Attempt to fetch saved razorpay_customer_id from profile for cleanup (best-effort)
    const [razorpayCustomerId, setRazorpayCustomerId] = useState<string | undefined>(undefined);
    useState(() => {
      (async () => {
        try {
          const { data: { user } } = await authService.supabase.auth.getUser();
          if (user?.id) {
            const { data: profile } = await authService.supabase
              .from('users')
              .select('razorpay_customer_id')
              .eq('id', user.id)
              .single();
            if (profile?.razorpay_customer_id) setRazorpayCustomerId(profile.razorpay_customer_id);
          }
        } catch {}
      })();
      return undefined;
    });
    // Render the Razorpay Subscription Button step for Startup role
    if (userData.role === 'Startup') {
      return (
        <StartupSubscriptionStep
          userEmail={userData.email}
          razorpayCustomerId={razorpayCustomerId}
          subscriptionButtonId={process.env.RAZORPAY_SUBSCRIPTION_BUTTON_ID || 'pl_RMvYPEir7kvx3E'}
          onSuccess={async () => {
            try {
              await finalizeRegistration(
                userData,
                pendingDocuments || {},
                pendingFounders || [],
                pendingCountry || userData.country
              );
            } catch (e) {
              console.error(e);
            }
          }}
          onBack={() => setCurrentStep('documents')}
        />
      );
    }

    // Fallback for non-startup (shouldn't happen as we gate earlier)
    return (
      <StartupPaymentStep
        userName={userData.name}
        userEmail={userData.email}
        applicationId={userData.email}
        onSuccess={async () => {
          try {
            await finalizeRegistration(
              userData,
              pendingDocuments || {},
              pendingFounders || [],
              pendingCountry || userData.country
            );
          } catch (e) {
            console.error(e);
          }
        }}
        onBack={() => setCurrentStep('documents')}
      />
    );
  }

  return (
    <BasicRegistrationStep
      onEmailVerified={handleEmailVerified}
      onNavigateToLogin={onNavigateToLogin}
      onNavigateToLanding={onNavigateToLanding}
    />
  );
};
