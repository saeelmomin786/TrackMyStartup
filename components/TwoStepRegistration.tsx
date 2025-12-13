import React, { useState } from 'react';
import { BasicRegistrationStep } from './BasicRegistrationStep';
import { DocumentUploadStep } from './DocumentUploadStep';
import { UserRole } from '../types';
import { authService, AuthUser } from '../lib/auth';
import { storageService } from '../lib/storage';
import { capTableService } from '../lib/capTableService';
import { InvestmentType, StartupDomain, StartupStage, FundraisingDetails } from '../types';

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
  const [currentStep, setCurrentStep] = useState<'basic' | 'documents'>('basic');
  const [pendingDocuments, setPendingDocuments] = useState<any | null>(null);
  const [pendingFounders, setPendingFounders] = useState<any[] | null>(null);
  const [pendingCountry, setPendingCountry] = useState<string | undefined>(undefined);
  const [userData, setUserData] = useState<{
    name: string;
    email: string;
    password: string;
    role: UserRole;
    startupName?: string;
    firmName?: string;
    country: string;
    investmentAdvisorCode?: string;
  } | null>(() => {
    // Try to restore data from sessionStorage (short-lived)
    const saved = sessionStorage.getItem('registrationData');
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
    firmName?: string;
  }) => {
    // Save data to sessionStorage (short-lived, cleared on tab close)
    sessionStorage.setItem('registrationData', JSON.stringify(data));
    setUserData(data);
    setCurrentStep('documents');
  };

  const handleBackToBasic = () => {
    setCurrentStep('basic');
    setUserData(null);
    // Clear saved data when going back
    sessionStorage.removeItem('registrationData');
  };

  const handleComplete = async (
    userData: any, 
    documents: any, 
    founders: any[],
    country?: string,
    fundraising?: {
      active: boolean;
      type: InvestmentType | '';
      value: number | '';
      equity: number | '';
      domain?: StartupDomain | '';
      stage?: StartupStage | '';
      pitchDeckFile?: File | null;
      pitchVideoUrl?: string;
      validationRequested?: boolean;
    },
    inviteCenter?: { name: string; email: string; phone: string },
    inviteInvestor?: { name: string; email: string; phone: string }
  ) => {
    // Payment step removed; proceed to finalize for all roles
    await finalizeRegistration(userData, documents, founders, country, fundraising, inviteCenter, inviteInvestor);
  };

  const finalizeRegistration = async (
    userData: any, 
    documents: any, 
    founders: any[],
    country?: string,
    fundraising?: {
      active: boolean;
      type: InvestmentType | '';
      value: number | '';
      equity: number | '';
      domain?: StartupDomain | '';
      stage?: StartupStage | '';
      pitchDeckFile?: File | null;
      pitchVideoUrl?: string;
      validationRequested?: boolean;
    },
    inviteCenter?: { name: string; email: string; phone: string },
    inviteInvestor?: { name: string; email: string; phone: string }
  ) => {
    try {
      console.log('🎉 Finalizing registration...');
      console.log('📋 User data:', userData);
      console.log('📄 Documents:', documents);
      console.log('👥 Founders:', founders);
      console.log('🌍 Country:', country);

      // Upload documents to storage
      let governmentIdUrl = '';
      let roleSpecificUrl = '';

      if (documents.government_id) {
        console.log('📤 Uploading government ID...');
        const result = await storageService.uploadVerificationDocument(
          documents.government_id, 
            userData.email, 
            'government-id'
        );
        if (result.success && result.url) {
          governmentIdUrl = result.url;
          console.log('✅ Government ID uploaded successfully:', governmentIdUrl);
        }
      }

      if (documents.roleSpecific) {
        const roleDocType = getRoleSpecificDocumentType(userData.role);
        console.log('📤 Uploading role-specific document:', roleDocType);
        const result = await storageService.uploadVerificationDocument(
            documents.roleSpecific, 
            userData.email, 
            roleDocType
        );
        if (result.success && result.url) {
              roleSpecificUrl = result.url;
          console.log('✅ Role-specific document uploaded successfully:', roleSpecificUrl);
        }
      }

      // Create user profile
      const { user, error: profileError } = await authService.createProfile(
        userData.name, 
        userData.role,
        userData.firmName
      );

      if (profileError || !user) {
        throw new Error(profileError || 'Failed to create profile');
      }

      // Database operations will be handled by the auth service
      console.log('📋 Profile created, documents uploaded:', {
        governmentIdUrl,
        roleSpecificUrl,
        userData
      });

      // If role is Startup: ensure startup exists, upload fundraising deck, and save fundraising details
      if (user?.role === 'Startup') {
        try {
          // Ensure startup exists and get its ID
          const startupName = userData.startupName || `${userData.name}'s Startup`;
          let startupId: number | null = null;
          const { data: existingStartup } = await authService.supabase
            .from('startups')
            .select('id')
            .eq('name', startupName)
            .single();

          if (existingStartup?.id) {
            startupId = existingStartup.id;
          } else {
            const { data: newStartup, error: createErr } = await authService.supabase
              .from('startups')
              .insert({
                name: startupName,
                investment_type: 'Seed',
                investment_value: 0,
                equity_allocation: 0,
                current_valuation: 0,
                compliance_status: 'Pending',
                sector: 'Technology',
                total_funding: 0,
                total_revenue: 0,
                registration_date: new Date().toISOString().split('T')[0],
                user_id: user.id
              })
              .select('id')
              .single();
            if (createErr) throw createErr;
            startupId = newStartup?.id || null;
          }

          if (startupId) {
            // Save incubation center info if provided
            if (inviteCenter && (inviteCenter.name || inviteCenter.email)) {
              try {
                // Try to find facilitator center by email or name
                const { data: facilitator, error: facError } = await authService.supabase
                  .from('users')
                  .select('id')
                  .eq('role', 'Startup Facilitation Center')
                  .or(`email.eq.${inviteCenter.email},center_name.ilike.%${inviteCenter.name}%`)
                  .limit(1)
                  .maybeSingle();

                if (facilitator && !facError) {
                  // Facilitator center found - could create relationship if table exists
                  console.log('✅ Found facilitator center:', facilitator.id);
                  // Note: Relationship creation would go here if facilitator_startups table is used
                }

                // Save incubation center contact info to startups table
                const incubationCenterData = {
                  incubation_center_name: inviteCenter.name || null,
                  incubation_center_email: inviteCenter.email || null,
                  incubation_center_phone: inviteCenter.phone || null
                };

                const { error: updateError } = await authService.supabase
                  .from('startups')
                  .update(incubationCenterData)
                  .eq('id', startupId);

                if (updateError) {
                  console.warn('Failed to save incubation center info:', updateError);
                } else {
                  console.log('✅ Incubation center info saved to database');
                }
              } catch (e) {
                console.warn('Failed to save incubation center info (non-blocking):', e);
              }
            }

            // Save investor info if provided
            if (inviteInvestor && (inviteInvestor.name || inviteInvestor.email)) {
              try {
                // Try to find investor by email
                const { data: investor, error: invError } = await authService.supabase
                  .from('users')
                  .select('id')
                  .eq('role', 'Investor')
                  .eq('email', inviteInvestor.email)
                  .limit(1)
                  .maybeSingle();

                if (investor && !invError) {
                  console.log('✅ Found investor:', investor.id);
                  // Investor found - could create relationship if needed
                }

                // Save investor contact info to startups table
                const investorData = {
                  investor_name: inviteInvestor.name || null,
                  investor_email: inviteInvestor.email || null,
                  investor_phone: inviteInvestor.phone || null
                };

                const { error: updateError } = await authService.supabase
                  .from('startups')
                  .update(investorData)
                  .eq('id', startupId);

                if (updateError) {
                  console.warn('Failed to save investor info:', updateError);
                } else {
                  console.log('✅ Investor info saved to database');
                }
              } catch (e) {
                console.warn('Failed to save investor info (non-blocking):', e);
              }
            }

            // Save fundraising details only if active fundraising is enabled
            if (fundraising && fundraising.active && fundraising.type && fundraising.value !== '' && fundraising.equity !== '') {
              let deckUrl: string | undefined = undefined;
              
              // Upload pitch deck if provided
              if (fundraising.pitchDeckFile) {
                try {
                  console.log('📤 Uploading pitch deck file:', fundraising.pitchDeckFile.name);
                  deckUrl = await capTableService.uploadPitchDeck(fundraising.pitchDeckFile, startupId);
                  console.log('✅ Pitch deck uploaded successfully:', deckUrl);
                } catch (e) {
                  console.error('❌ Pitch deck upload failed:', e);
                  console.warn('Pitch deck upload failed (non-blocking):', e);
                }
              }

              // Save to fundraising_details table only
              const frToSave: FundraisingDetails = {
                active: !!fundraising.active,
                type: fundraising.type as InvestmentType,
                value: Number(fundraising.value),
                equity: Number(fundraising.equity),
                domain: (fundraising.domain || undefined) as StartupDomain | undefined,
                stage: (fundraising.stage || undefined) as StartupStage | undefined,
                validationRequested: !!fundraising.validationRequested,
                pitchDeckUrl: deckUrl,
                pitchVideoUrl: fundraising.pitchVideoUrl || undefined
              };

              try {
                await capTableService.updateFundraisingDetails(startupId, frToSave);
                console.log('✅ Fundraising details saved to fundraising_details table');
              } catch (e) {
                console.warn('Failed to save fundraising during registration (non-blocking):', e);
              }
            }
          }
        } catch (e) {
          console.warn('Startup creation/fundraising init failed (non-blocking):', e);
        }
      }

      // Clear saved data
      sessionStorage.removeItem('registrationData');
      
      console.log('✅ Registration completed successfully');
      onRegister(user, founders, userData.startupName, country);

        } catch (error) {
      console.error('❌ Error finalizing registration:', error);
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

  return (
    <BasicRegistrationStep
      onEmailVerified={handleEmailVerified}
      onNavigateToLogin={onNavigateToLogin}
      onNavigateToLanding={onNavigateToLanding}
    />
  );
};