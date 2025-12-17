import { supabase } from './supabase'
import { UserRole, Founder } from '../types'
import { generateInvestorCode, generateInvestmentAdvisorCode, generateMentorCode } from './utils'
import { getCurrentConfig } from '../config/environment'

export interface AuthUser {
  id: string
  email: string
  name: string
  role: UserRole
  startup_name?: string
  center_name?: string
  firm_name?: string
  investor_code?: string
  ca_code?: string
  cs_code?: string
  mentor_code?: string
  registration_date: string
  // Profile fields
  phone?: string
  address?: string
  city?: string
  state?: string
  country?: string
  currency?: string
  company?: string
  company_type?: string // Added company type field
  // Verification documents from registration
  government_id?: string
  ca_license?: string
  cs_license?: string
  verification_documents?: string[]
  profile_photo_url?: string
  is_profile_complete?: boolean // Added for profile completion status
  // Investment Advisor specific fields
  investment_advisor_code?: string
  investment_advisor_code_entered?: string
  logo_url?: string
  proof_of_business_url?: string
  financial_advisor_license_url?: string
}

export interface SignUpData {
  email: string
  password: string
  name: string
  role: UserRole
  startupName?: string
  centerName?: string
  firmName?: string
  investmentAdvisorCode?: string
}

export interface SignInData {
  email: string
  password: string
}

export interface PasswordResetData {
  email: string
}

// Authentication service
// Cache for getCurrentUser to prevent multiple simultaneous calls
let _getCurrentUserCache: { promise: Promise<AuthUser | null> | null; timestamp: number } = { promise: null, timestamp: 0 };
const GET_CURRENT_USER_CACHE_MS = 2000; // Cache for 2 seconds

export const authService = {
  // Export supabase client for direct access
  supabase,
  
  // Refresh session utility
  async refreshSession(): Promise<boolean> {
    try {
      const { error } = await supabase.auth.refreshSession();
      if (error) {
        console.error('Failed to refresh session:', error);
        return false;
      }
      return true;
    } catch (error) {
      console.error('Error refreshing session:', error);
      return false;
    }
  },
  
  // Check if user is authenticated
  async isAuthenticated(): Promise<boolean> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      return !!session;
    } catch (error) {
      console.error('Error checking authentication:', error);
      return false;
    }
  },

  // Test function to check if Supabase auth is working
  async testAuthConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('Testing basic Supabase auth connection...');
      const { data, error } = await supabase.auth.getUser();
      if (error) {
        console.error('Auth test failed:', error);
        return { success: false, error: error.message };
      }
      console.log('Auth test successful');
      return { success: true };
    } catch (error) {
      console.error('Auth test error:', error);
      return { success: false, error: 'Auth connection failed' };
    }
  },

  // Send password reset email
  async sendPasswordResetEmail(email: string): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('Sending password reset email to:', email);
      
      const config = getCurrentConfig();
      const redirectUrl = config.passwordResetUrl || `${window.location.origin}/reset-password`;
      
      console.log('Using password reset redirect URL:', redirectUrl);
      
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl
      });

      if (error) {
        console.error('Password reset error:', error);
        return { success: false, error: error.message };
      }

      console.log('Password reset email sent successfully');
      return { success: true };
    } catch (error) {
      console.error('Password reset error:', error);
      return { success: false, error: 'Failed to send password reset email. Please try again.' };
    }
  },

  // Reset password with new password (for use after clicking reset link)
  async resetPassword(newPassword: string): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('Resetting password...');
      
      // First, verify the user is authenticated and in a valid session
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        console.error('User not authenticated for password reset:', userError);
        
        // Try alternative approach - sometimes the session exists but getUser() fails
        console.log('Trying alternative authentication check...');
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError || !session?.user) {
          console.error('No valid session found:', sessionError);
          return { success: false, error: 'Invalid session. Please request a new password reset link.' };
        }
        
        console.log('Session found for password reset:', session.user.email);
      } else {
        console.log('User authenticated for password reset:', user.email);
      }
      
      // Update the password
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) {
        console.error('Password update error:', error);
        return { success: false, error: error.message };
      }

      console.log('Password updated successfully');
      return { success: true };
    } catch (error) {
      console.error('Password update error:', error);
      return { success: false, error: 'Failed to update password. Please try again.' };
    }
  },

  // Check if user profile is complete (has verification documents and role-specific requirements)
  // Updated to check user_profiles table first, then fallback to users table
  async isProfileComplete(userId: string): Promise<boolean> {
    try {
      console.log('🔍 isProfileComplete: Checking profile for userId:', userId);
      
      // First try to get from user_profiles (new system)
      const { data: profileFromProfiles, error: profilesError } = await supabase
        .from('user_profiles')
        .select('government_id, ca_license, cs_license, verification_documents, role, center_name, logo_url, financial_advisor_license_url, is_profile_complete')
        .eq('id', userId)
        .maybeSingle();
      
      if (profilesError) {
        console.error('❌ isProfileComplete: Error fetching profile:', profilesError);
        return false;
      }
      
      if (!profileFromProfiles) {
        console.log('❌ isProfileComplete: No profile found for userId:', userId);
        return false;
      }
      
      console.log('🔍 isProfileComplete: Profile found:', {
        role: profileFromProfiles.role,
        hasGovId: !!profileFromProfiles.government_id,
        hasCaLicense: !!profileFromProfiles.ca_license,
        hasVerificationDocs: !!(profileFromProfiles.verification_documents && profileFromProfiles.verification_documents.length > 0),
        verificationDocsCount: profileFromProfiles.verification_documents?.length || 0,
        is_profile_complete: profileFromProfiles.is_profile_complete
      });
      
      // For older users, always check documents even if is_profile_complete flag exists
      // This ensures users with documents aren't incorrectly marked as incomplete
      // Only trust is_profile_complete=true, but always verify if it's false or undefined
      if (profileFromProfiles.is_profile_complete === true) {
        console.log('✅ isProfileComplete: is_profile_complete flag is true, returning true');
        return true;
      }
      
      // If is_profile_complete is false or undefined, check documents and role requirements
      if (profileFromProfiles.is_profile_complete === false) {
        console.log('⚠️ isProfileComplete: is_profile_complete is false, but checking documents anyway (for older users)');
      } else {
        console.log('🔍 isProfileComplete: is_profile_complete is undefined, checking documents');
      }
      
      // Check basic document requirements
      const hasBasicDocuments = !!(profileFromProfiles.government_id || 
                                  (profileFromProfiles.verification_documents && profileFromProfiles.verification_documents.length > 0));

      if (!hasBasicDocuments) {
        console.log('❌ isProfileComplete: No basic documents found');
        return false;
      }

      // Role-specific completion requirements
      let result = false;
      switch (profileFromProfiles.role) {
        case 'Startup Facilitation Center':
          result = !!(profileFromProfiles.center_name && profileFromProfiles.center_name.trim() !== '');
          console.log('🔍 isProfileComplete: Startup Facilitation Center check:', result, { center_name: profileFromProfiles.center_name });
          break;
        
        case 'Investment Advisor':
          result = !!(profileFromProfiles.government_id && profileFromProfiles.ca_license && profileFromProfiles.financial_advisor_license_url);
          console.log('🔍 isProfileComplete: Investment Advisor check:', result, {
            hasGovId: !!profileFromProfiles.government_id,
            hasCaLicense: !!profileFromProfiles.ca_license,
            hasFinancialLicense: !!profileFromProfiles.financial_advisor_license_url
          });
          break;
        
        case 'Startup':
          result = !!(profileFromProfiles.government_id && profileFromProfiles.ca_license);
          console.log('🔍 isProfileComplete: Startup check:', result, {
            hasGovId: !!profileFromProfiles.government_id,
            hasCaLicense: !!profileFromProfiles.ca_license
          });
          break;
        
        case 'Investor':
          // For Investors: require government_id and either ca_license OR verification_documents
          // This allows older Investors who may have documents in verification_documents instead of ca_license
          result = !!(profileFromProfiles.government_id && 
                   (profileFromProfiles.ca_license || 
                    (profileFromProfiles.verification_documents && profileFromProfiles.verification_documents.length > 0)));
          console.log('🔍 isProfileComplete: Investor check:', result, {
            hasGovId: !!profileFromProfiles.government_id,
            hasCaLicense: !!profileFromProfiles.ca_license,
            hasVerificationDocs: !!(profileFromProfiles.verification_documents && profileFromProfiles.verification_documents.length > 0),
            verificationDocsCount: profileFromProfiles.verification_documents?.length || 0
          });
          break;
        
        default:
          result = hasBasicDocuments;
          console.log('🔍 isProfileComplete: Default role check:', result, { role: profileFromProfiles.role });
      }
      
      console.log('✅ isProfileComplete: Final result:', result);
      return result;
    } catch (error) {
      console.error('❌ Error checking profile completion:', error);
      return false;
    }
  },

  // Get current user profile (BACKWARD COMPATIBLE - checks user_profiles first, falls back to users)
  async getCurrentUser(): Promise<AuthUser | null> {
    // Prevent multiple simultaneous calls using cache
    const now = Date.now();
    if (_getCurrentUserCache.promise && (now - _getCurrentUserCache.timestamp) < GET_CURRENT_USER_CACHE_MS) {
      return _getCurrentUserCache.promise;
    }

    const promise = this._getCurrentUserInternal();
    _getCurrentUserCache = { promise, timestamp: now };
    
    // Clear cache after promise resolves
    promise.finally(() => {
      if (_getCurrentUserCache.promise === promise) {
        _getCurrentUserCache = { promise: null, timestamp: 0 };
      }
    });
    
    return promise;
  },

  async _getCurrentUserInternal(): Promise<AuthUser | null> {
    try {
      // First, try to refresh the session if needed
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('Session error:', sessionError);
        // Try to refresh the session
        const { error: refreshError } = await supabase.auth.refreshSession();
        if (refreshError) {
          console.error('Failed to refresh session:', refreshError);
          return null;
        }
      }
      
      const { data: { user }, error } = await supabase.auth.getUser()
      
      if (error || !user) {
        return null
      }

      // Try to get profile from user_profiles (new multi-profile system) first
      let profile = null;
      let profileError = null;
      let usingNewSystem = false;
      
      // Retry logic for database queries
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          // First try: Get from user_profiles using the safe function
          // Note: RPC functions that return TABLE return an array, not a single object
          const profilePromise = supabase
            .rpc('get_current_profile_safe', { auth_user_uuid: user.id });

          const profileTimeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Profile check timeout after 5 seconds')), 5000);
          });

          const result = await Promise.race([profilePromise, profileTimeoutPromise]) as any;
          
          // RPC functions returning TABLE return { data: array, error }
          if (result.data && Array.isArray(result.data) && result.data.length > 0) {
            profile = result.data[0];
            // Check if this profile is from user_profiles (new system)
            // The function returns source_table, but we can also check if profile_id exists
            usingNewSystem = !!(profile.profile_id && profile.profile_id !== profile.auth_user_id);
            profileError = null;
            break; // Success, exit retry loop
          } else if (result.data && Array.isArray(result.data) && result.data.length === 0) {
            // No profile found in new system, try old system
            break;
          } else {
            profileError = result.error;
          }
          
          if (attempt < 3) {
            await new Promise(resolve => setTimeout(resolve, 500 * attempt)); // Faster retry
          }
        } catch (retryError) {
          console.error(`Profile query attempt ${attempt} error:`, retryError);
          if (attempt === 3) {
            profileError = retryError;
          }
        }
      }

      // Only use user_profiles - no fallback to users table
      if (profileError || !profile) {
        console.log('No profile found in user_profiles for user:', user.email);
        return null
      }

      // Profile ID is the actual profile UUID from user_profiles
      const profileId = profile.profile_id || profile.id;
      const isComplete = await this.isProfileComplete(profileId);

      const userData = {
        id: profile.profile_id || profile.id,
        email: profile.email,
        name: profile.name,
        role: profile.role,
        startup_name: profile.startup_name,
        center_name: profile.center_name,
        firm_name: profile.firm_name,
        investor_code: profile.investor_code,
        investment_advisor_code: profile.investment_advisor_code,
        investment_advisor_code_entered: profile.investment_advisor_code_entered,
        ca_code: profile.ca_code,
        cs_code: profile.cs_code,
        mentor_code: profile.mentor_code || null,
        registration_date: profile.registration_date,
        phone: profile.phone,
        address: profile.address,
        city: profile.city,
        state: profile.state,
        country: profile.country,
        company: profile.company,
        company_type: profile.company_type,
        government_id: profile.government_id,
        ca_license: profile.ca_license,
        cs_license: profile.cs_license,
        verification_documents: profile.verification_documents,
        profile_photo_url: profile.profile_photo_url,
        logo_url: profile.logo_url,
        proof_of_business_url: profile.proof_of_business_url,
        financial_advisor_license_url: profile.financial_advisor_license_url,
        is_profile_complete: isComplete
      };
      
      return userData;
    } catch (error) {
      console.error('Error getting current user:', error)
      return null
    }
  },

  // Sign up new user
  async signUp(data: SignUpData & { founders?: Founder[]; fileUrls?: { [key: string]: string } }): Promise<{ user: AuthUser | null; error: string | null; confirmationRequired: boolean }> {
    try {
      console.log('=== SIGNUP START ===');
      console.log('Signing up user:', data.email);
      
      // Double-check if email already exists before proceeding
      const emailCheck = await this.checkEmailExists(data.email);
      if (emailCheck.exists) {
        console.log('Email already exists, preventing signup:', data.email);
        return { user: null, error: 'User with this email already exists. Please sign in instead.', confirmationRequired: false };
      }
      
      // Create Supabase auth user directly
      console.log('Creating Supabase auth user...');
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            name: data.name,
            role: data.role,
            startupName: data.startupName, // make available after confirmation
            centerName: data.centerName, // make available after confirmation
            fileUrls: data.fileUrls || {}
          }
        }
      });

      console.log('Auth response received:', { authData: !!authData, authError: !!authError });

      if (authError) {
        console.error('Auth error:', authError);
        // Check if it's a user already exists error
        if (authError.message.includes('already registered') || 
            authError.message.includes('already exists') || 
            authError.message.includes('User already registered')) {
          return { user: null, error: 'User with this email already exists. Please sign in instead.', confirmationRequired: false };
        }
        return { user: null, error: authError.message, confirmationRequired: false }
      }

      console.log('Auth user created successfully, session:', !!authData.session);
      console.log('=== SIGNUP END ===');

      // Check if email confirmation is required
      if (authData.user && !authData.user.email_confirmed_at) {
        console.log('Email confirmation required, user not fully authenticated');
        return { 
          user: null, 
          error: null, 
          confirmationRequired: true 
        };
      }

      // Create user profile only after email confirmation
      if (authData.user && authData.user.email_confirmed_at) {
        console.log('Creating user profile in database...');
        // Generate codes based on role
        const investorCode = data.role === 'Investor' ? generateInvestorCode() : null;
        const investmentAdvisorCode = data.role === 'Investment Advisor' ? generateInvestmentAdvisorCode() : null;
        
        const { data: profile, error: profileError } = await supabase
          .from('users')
          .insert({
            id: authData.user.id,
            email: authData.user.email,
            name: data.name,
            role: data.role,
            startup_name: data.role === 'Startup' ? data.startupName : null,
            center_name: data.role === 'Startup Facilitation Center' ? data.centerName : null,
            firm_name: data.role === 'Investment Advisor' ? data.firmName : null,
            investor_code: investorCode,
            investment_advisor_code: investmentAdvisorCode,
            // Store the Investment Advisor code entered by user (for Investors and Startups)
            investment_advisor_code_entered: data.investmentAdvisorCode || null,
            ca_code: null, // CA code will be auto-generated by trigger
            registration_date: new Date().toISOString().split('T')[0],
            // Add verification document URLs
            government_id: data.fileUrls?.governmentId || null,
            ca_license: data.fileUrls?.roleSpecific || null,
            verification_documents: (() => {
              const docs = [];
              if (data.fileUrls?.governmentId) docs.push(data.fileUrls.governmentId);
              if (data.fileUrls?.roleSpecific) docs.push(data.fileUrls.roleSpecific);
              return docs.length > 0 ? docs : null;
            })(),
            // Add profile fields (will be filled later by user)
            phone: null,
            address: null,
            city: null,
            state: null,
            country: null,
            company: null,
            profile_photo_url: null
          })
          .select()
          .single()

        if (profileError) {
          console.error('Profile creation error:', profileError);
          return { user: null, error: 'Failed to create user profile', confirmationRequired: false }
        }

        console.log('User profile created successfully');

        // If user is a startup, ensure a startup record exists
        if (data.role === 'Startup') {
          console.log('Creating startup and founders...');
          try {
            let startup = null as any;
            const { data: existingStartup } = await supabase
              .from('startups')
              .select('id')
              .eq('name', data.startupName || `${data.name}'s Startup`)
              .single();

            if (!existingStartup) {
              const insertRes = await supabase
                .from('startups')
                .insert({
                  name: data.startupName || `${data.name}'s Startup`,
                  investment_type: 'Seed',
                  investment_value: 0,
                  equity_allocation: 0,
                  current_valuation: 0,
                  compliance_status: 'Pending',
                  sector: 'Technology',
                  total_funding: 0,
                  total_revenue: 0,
                  registration_date: new Date().toISOString().split('T')[0],
                  user_id: authData.user.id
                })
                .select()
                .single();
              startup = insertRes.data;
            } else {
              startup = existingStartup;
            }

            if (startup && data.founders && data.founders.length > 0) {
              // Add founders
              const foundersData = data.founders.map(founder => ({
                startup_id: startup.id,
                name: founder.name,
                email: founder.email
              }))

              const { error: foundersError } = await supabase
                .from('founders')
                .insert(foundersData)

              if (foundersError) {
                console.error('Error adding founders:', foundersError);
              }
            }
          } catch (error) {
            console.error('Error creating startup:', error);
          }
        }

        return {
          user: {
            id: profile.id,
            email: profile.email,
            name: profile.name,
            role: profile.role,
            startup_name: profile.startup_name,
            investor_code: profile.investor_code,
            ca_code: profile.ca_code,
            cs_code: profile.cs_code,
            registration_date: profile.registration_date,
            // Include new profile fields
            phone: profile.phone,
            address: profile.address,
            city: profile.city,
            state: profile.state,
            country: profile.country,
            company: profile.company,
            firm_name: profile.firm_name,
            // Include verification document fields
            government_id: profile.government_id,
            ca_license: profile.ca_license,
            verification_documents: profile.verification_documents,
            profile_photo_url: profile.profile_photo_url
          },
          error: null,
          confirmationRequired: false
        }
      }

      // If we get here, email confirmation is required
      return { user: null, error: null, confirmationRequired: true }
    } catch (error) {
      console.error('Error in signUp:', error)
      return { user: null, error: 'An unexpected error occurred', confirmationRequired: false }
    }
  },

  // Minimal signIn function for testing
  async signInMinimal(data: SignInData): Promise<{ user: AuthUser | null; error: string | null }> {
    try {
      console.log('=== MINIMAL SIGNIN START ===');
      console.log('Signing in user:', data.email);
      
      // Just do the basic auth call
      const { data: authData, error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password
      });

      console.log('Minimal auth call completed:', { authData: !!authData, error: !!error });

      if (error) {
        console.error('Sign in error:', error);
        return { user: null, error: error.message };
      }

      if (!authData.user) {
        return { user: null, error: 'No user found' };
      }

      console.log('Minimal auth successful for:', authData.user.email);
      console.log('=== MINIMAL SIGNIN END ===');
      
      // Return a basic user object
      return {
        user: {
          id: authData.user.id,
          email: authData.user.email,
          name: authData.user.user_metadata?.name || 'Unknown',
          role: authData.user.user_metadata?.role || 'Investor',
          registration_date: new Date().toISOString().split('T')[0]
        },
        error: null
      }
    } catch (error) {
      console.error('Error in minimal sign in:', error)
      return { user: null, error: 'An unexpected error occurred. Please try again.' }
    }
  },

  // Create user profile (called from CompleteProfilePage)
  async createProfile(name: string, role: UserRole, firmName?: string): Promise<{ user: AuthUser | null; error: string | null }> {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      
      if (userError || !user) {
        return { user: null, error: 'User not authenticated' }
      }

      const { data: profile, error: profileError } = await supabase
        .from('users')
        .insert({
          id: user.id,
          email: user.email,
          name: name,
          role: role,
          firm_name: role === 'Investment Advisor' ? firmName : null,
          registration_date: new Date().toISOString().split('T')[0]
        })
        .select()
        .single()

      if (profileError) {
        console.error('Profile creation error:', profileError)
        return { user: null, error: 'Failed to create profile' }
      }

      return {
        user: {
          id: profile.id,
          email: profile.email,
          name: profile.name,
          role: profile.role,
          registration_date: profile.registration_date
        },
        error: null
      }
    } catch (error) {
      console.error('Error creating profile:', error)
      return { user: null, error: 'An unexpected error occurred' }
    }
  },

  // Sign out user
  async signOut(): Promise<{ error: string | null }> {
    try {
      const { error } = await supabase.auth.signOut()
      return { error: error?.message || null }
    } catch (error) {
      console.error('Error signing out:', error)
      return { error: 'An unexpected error occurred' }
    }
  },

  // Update user profile (comprehensive version)
  // CRITICAL FIX: Now checks user_profiles first (multi-profile system), then falls back to users
  async updateProfile(userId: string, updates: any): Promise<{ user: AuthUser | null; error: string | null }> {
    try {
      // First, check if this profile exists in user_profiles (new multi-profile system)
      const { data: { user: authUser } } = await supabase.auth.getUser();
      const authUserId = authUser?.id;
      
      if (!authUserId) {
        return { user: null, error: 'User not authenticated' };
      }

      // Try to update in user_profiles first (new multi-profile system)
      // RLS policy will check auth_user_id = auth.uid() automatically
      let data: any;
      let error: any;
      
      // First, try updating user_profiles by profile ID
      const { data: updatedProfile, error: profileUpdateError } = await supabase
        .from('user_profiles')
        .update(updates)
        .eq('id', userId)
        .select()
        .maybeSingle(); // Use maybeSingle() instead of single() to avoid 406 error when no rows

      if (!profileUpdateError && updatedProfile) {
        // Successfully updated in user_profiles
        console.log('✅ Updating profile in user_profiles table');
        data = updatedProfile;
        error = null;
      } else {
        // If that failed, try updating by auth_user_id (in case userId is auth_user_id)
        // But only if we have multiple profiles, we need to find the active one
        const { data: updatedProfileByAuth, error: profileUpdateErrorByAuth } = await supabase
          .from('user_profiles')
          .update(updates)
          .eq('auth_user_id', authUserId)
          .select()
          .maybeSingle(); // Use maybeSingle() to avoid 406 error

        if (!profileUpdateErrorByAuth && updatedProfileByAuth) {
          // Successfully updated in user_profiles by auth_user_id
          console.log('✅ Updating profile in user_profiles table (by auth_user_id)');
          data = updatedProfileByAuth;
          error = null;
        } else {
          // Profile not found in user_profiles - cannot update
          console.log('❌ Profile not found in user_profiles table');
          return { user: null, error: 'Profile not found in user_profiles table' };
        }
      }

      if (error) {
        console.error('❌ Profile update error:', error);
        return { user: null, error: error.message }
      }

      return {
        user: {
          id: data.id,
          email: data.email,
          name: data.name,
          role: data.role,
          registration_date: data.registration_date,
          phone: data.phone,
          address: data.address,
          city: data.city,
          state: data.state,
          country: data.country,
          company: data.company,
          company_type: data.company_type,
          firm_name: data.firm_name,
          profile_photo_url: data.profile_photo_url,
          government_id: data.government_id,
          ca_license: data.ca_license,
          cs_license: data.cs_license,
          investment_advisor_code: data.investment_advisor_code,
          investment_advisor_code_entered: data.investment_advisor_code_entered,
          logo_url: data.logo_url,
          financial_advisor_license_url: data.financial_advisor_license_url,
          ca_code: data.ca_code,
          cs_code: data.cs_code,
          startup_count: data.startup_count,
          verification_documents: data.verification_documents
        } as AuthUser,
        error: null
      }
    } catch (error) {
      console.error('Error updating profile:', error)
      return { user: null, error: 'An unexpected error occurred' }
    }
  },

  // Listen to auth state changes
  onAuthStateChange(callback: (event: string, session: any) => void) {
    return supabase.auth.onAuthStateChange(callback)
  },

  // Handle email confirmation
  async handleEmailConfirmation(): Promise<{ user: AuthUser | null; error: string | null }> {
    try {
      console.log('=== EMAIL CONFIRMATION START ===');
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      
      if (userError || !user) {
        console.error('User not authenticated:', userError);
        return { user: null, error: 'User not authenticated' }
      }

      console.log('User authenticated:', user.email);
      console.log('User metadata:', user.user_metadata);

      // Check if user profile exists in user_profiles table
      console.log('Checking if profile exists in database...');
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('auth_user_id', user.id)
        .maybeSingle()

      if (profileError || !profile) {
        console.log('Profile not found in user_profiles, cannot create from metadata (use registration flow)');
        return { user: null, error: 'Profile not found. Please complete registration.' }
      }

      console.log('Profile found:', profile);
      console.log('=== EMAIL CONFIRMATION END ===');
      return {
        user: {
          id: profile.id,
          email: profile.email,
          name: profile.name,
          role: profile.role,
          registration_date: profile.registration_date
        },
        error: null
      }
    } catch (error) {
      console.error('Error handling email confirmation:', error)
      return { user: null, error: 'An unexpected error occurred' }
    }
  },

  // Refresh session
  async refreshSession(): Promise<{ user: AuthUser | null; error: string | null }> {
    try {
      const { data: { session }, error } = await supabase.auth.refreshSession()
      
      if (error || !session?.user) {
        return { user: null, error: error?.message || 'No session found' }
      }

      // Use getCurrentUser() which handles user_profiles first, then falls back to users table
      // This ensures we use the correct table based on the multi-profile system
      const user = await this.getCurrentUser();

      if (!user) {
        return { user: null, error: 'Profile not found' }
      }

      return {
        user: user,
        error: null
      }
    } catch (error) {
      console.error('Error refreshing session:', error)
      return { user: null, error: 'An unexpected error occurred' }
    }
  },

  // Check if email exists
  async checkEmailExists(email: string): Promise<{ exists: boolean; error?: string }> {
    try {
      console.log('Checking if email exists:', email);
      
      // Use database function to check email existence (bypasses RLS using SECURITY DEFINER)
      // This is better than API endpoint - faster, no extra network call, works directly from frontend
      const { data, error } = await supabase.rpc('check_email_exists', {
        email_to_check: email.toLowerCase().trim()
      });

      if (error) {
        console.error('Error checking email via RPC:', error);
        // If RPC function doesn't exist, fall back to direct query (may fail due to RLS)
        console.warn('RPC function not available, falling back to direct query');
        const { data: profiles, error: profileError } = await supabase
          .from('user_profiles')
          .select('id')
          .eq('email', email.toLowerCase().trim())
          .limit(1);

        if (profileError) {
          console.error('Direct query also failed:', profileError);
          return { exists: false, error: 'Unable to check email availability' };
        }

        if (profiles && profiles.length > 0) {
          console.log('Email already exists in user_profiles:', email);
          return { exists: true };
        } else {
          console.log('Email is available:', email);
          return { exists: false };
        }
      }

      // RPC function returned result
      if (data === true) {
        console.log('Email already exists in user_profiles:', email);
        return { exists: true };
      } else {
        console.log('Email is available:', email);
        return { exists: false };
      }
    } catch (error: any) {
      console.error('Error checking email existence:', error);
      return { exists: false, error: error.message || 'Unable to check email availability. Please try again.' };
    }
  },

  // =====================================================
  // MULTI-PROFILE FUNCTIONS (New - for profile switching)
  // =====================================================

  // Get all profiles for current user
  async getUserProfiles(): Promise<Array<{
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
  }>> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return [];
      }

      const { data, error } = await supabase
        .rpc('get_user_profiles', { auth_user_uuid: user.id });

      if (error) {
        console.error('Error fetching user profiles:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getUserProfiles:', error);
      return [];
    }
  },

  // Switch active profile
  async switchProfile(profileId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'Not authenticated' };
      }

      console.log('🔄 Switching profile:', { auth_user_id: user.id, profile_id: profileId });

      const { data, error } = await supabase
        .rpc('switch_profile', {
          auth_user_uuid: user.id,
          profile_uuid: profileId
        });

      if (error) {
        console.error('❌ Error switching profile:', error);
        return { success: false, error: error.message || 'Failed to switch profile' };
      }

      console.log('✅ Profile switch RPC successful, result:', data);

      // Wait a moment to ensure database is updated
      await new Promise(resolve => setTimeout(resolve, 300));

      // Verify the switch worked by getting current profile
      const currentProfile = await this.getCurrentUser();
      console.log('🔄 Verified current profile after switch:', currentProfile?.role, currentProfile?.id, 'Expected profile ID:', profileId);

      return { success: true };
    } catch (error: any) {
      console.error('❌ Error in switchProfile:', error);
      return { success: false, error: error.message || 'Failed to switch profile' };
    }
  },

  // Create additional profile (for existing users)
  async createProfile(profileData: {
    name: string;
    role: UserRole;
    startupName?: string;
    centerName?: string;
    firmName?: string;
    investmentAdvisorCode?: string;
  }, options?: { skipSwitch?: boolean }): Promise<{ profile: any | null; error: string | null }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { profile: null, error: 'Not authenticated' };
      }

      // Check if user already has this role
      const { data: existing } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('auth_user_id', user.id)
        .eq('role', profileData.role)
        .maybeSingle();

      if (existing) {
        return { 
          profile: null, 
          error: `You already have a ${profileData.role} profile. Please switch to it instead.` 
        };
      }

      // Generate codes based on role
      const investorCode = profileData.role === 'Investor' ? generateInvestorCode() : null;
      const investmentAdvisorCode = profileData.role === 'Investment Advisor' ? generateInvestmentAdvisorCode() : null;
      const mentorCode = profileData.role === 'Mentor' ? generateMentorCode() : null;

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
          mentor_code: mentorCode,
          investment_advisor_code_entered: profileData.investmentAdvisorCode || null,
          registration_date: new Date().toISOString().split('T')[0]
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating profile:', error);
        return { profile: null, error: error.message };
      }

      // Set as active profile (unless skipSwitch is true - for Add Profile flow)
      // We'll switch after Form 2 is complete
      if (!options?.skipSwitch) {
        const switchResult = await this.switchProfile(newProfile.id);
        if (!switchResult.success) {
          console.warn('Profile created but failed to set as active:', switchResult.error);
        }
      } else {
        console.log('⏭️ Skipping profile switch - will switch after Form 2 completion');
      }

      return { profile: newProfile, error: null };
    } catch (error: any) {
      console.error('Error in createProfile:', error);
      return { profile: null, error: error.message || 'Failed to create profile' };
    }
  }
}
