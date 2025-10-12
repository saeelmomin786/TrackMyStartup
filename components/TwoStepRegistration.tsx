import React, { useState } from 'react';
import { BasicRegistrationStep } from './BasicRegistrationStep';
import { DocumentUploadStep } from './DocumentUploadStep';
import { UserRole } from '../types';
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
    // Payment step removed; proceed to finalize for all roles
    await finalizeRegistration(userData, documents, founders, country);
  };

  const finalizeRegistration = async (
    userData: any, 
    documents: any, 
    founders: any[],
    country?: string
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
        userData.role
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

      // Clear saved data
      localStorage.removeItem('registrationData');
      
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