import { supabase } from './supabase'
import { UserRole, Founder } from '../types'
import { generateInvestorCode, generateInvestmentAdvisorCode } from './utils'
import { getCurrentConfig } from '../config/environment'

export interface AuthUser {
  id: string
  email: string
  name: string
  role: UserRole
  startup_name?: string
  center_name?: string
  investor_code?: string
  ca_code?: string
  cs_code?: string
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
  async isProfileComplete(userId: string): Promise<boolean> {
    try {
      const { data: profiles, error } = await supabase
        .from('users')
        .select('government_id, ca_license, verification_documents, role, center_name, logo_url, financial_advisor_license_url')
        .eq('id', userId);
      
      const profile = profiles && profiles.length > 0 ? profiles[0] : null;

      if (error || !profile) {
        return false;
      }

      // Check basic document requirements (government_id)
      const hasBasicDocuments = !!(profile.government_id || 
                                  (profile.verification_documents && profile.verification_documents.length > 0));

      if (!hasBasicDocuments) {
        return false;
      }

      // Role-specific completion requirements
      switch (profile.role) {
        case 'Startup Facilitation Center':
          // Facilitators need center_name in addition to documents
          return !!(profile.center_name && profile.center_name.trim() !== '');
        
        case 'Investment Advisor':
          // Investment Advisors need government_id, ca_license (role-specific document), and financial_advisor_license_url
          // Logo is required during initial registration but optional after registration is complete
          return !!(profile.government_id && profile.ca_license && profile.financial_advisor_license_url);
        
        case 'Startup':
          // Startups need both documents and startup profile (checked separately in startup table)
          return !!(profile.government_id && profile.ca_license);
        
        case 'Investor':
          // Investors need both documents
          return !!(profile.government_id && profile.ca_license);
        
        default:
          // For other roles, just check basic documents
          return hasBasicDocuments;
      }
    } catch (error) {
      console.error('Error checking profile completion:', error);
      return false;
    }
  },

  // Get current user profile
  async getCurrentUser(): Promise<AuthUser | null> {
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
        console.log('No authenticated user found in Supabase auth');
        return null
      }

      console.log('Found user in Supabase auth:', user.email);

      // Get user profile from our users table with timeout and retry logic
      let profile = null;
      let profileError = null;
      
      // Retry logic for database queries
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          const profilePromise = supabase
            .from('users')
            .select('*')
            .eq('id', user.id)
            .maybeSingle();

          const profileTimeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Profile check timeout after 5 seconds')), 5000);
          });

          const result = await Promise.race([profilePromise, profileTimeoutPromise]) as any;
          profile = result.data;
          profileError = result.error;
          
          if (!profileError) {
            break; // Success, exit retry loop
          }
          
          if (attempt < 3) {
            console.log(`Profile query attempt ${attempt} failed, retrying...`);
            await new Promise(resolve => setTimeout(resolve, 1000 * attempt)); // Exponential backoff
          }
        } catch (retryError) {
          console.error(`Profile query attempt ${attempt} error:`, retryError);
          if (attempt === 3) {
            profileError = retryError;
          }
        }
      }

      if (profileError || !profile) {
        console.log('No profile found for user:', user.email);
        return null
      }

      console.log('Found user profile:', profile.email);
      console.log('Profile data:', profile);
      console.log('Profile role:', profile.role);
      console.log('Profile role type:', typeof profile.role);
      console.log('Startup name from profile:', profile.startup_name);
      console.log('Profile keys:', Object.keys(profile));
      console.log('Profile startup_name type:', typeof profile.startup_name);

      // Check if profile is complete
      const isComplete = await this.isProfileComplete(user.id);
      console.log('Profile completion status:', isComplete);

      const userData = {
        id: profile.id,
        email: profile.email,
        name: profile.name,
        role: profile.role,
        startup_name: profile.startup_name,
        center_name: profile.center_name,
        investor_code: profile.investor_code,
        investment_advisor_code: profile.investment_advisor_code,
        investment_advisor_code_entered: profile.investment_advisor_code_entered,
        ca_code: profile.ca_code,
        cs_code: profile.cs_code,
        registration_date: profile.registration_date,
        phone: profile.phone,
        address: profile.address,
        city: profile.city,
        state: profile.state,
        country: profile.country,
        company: profile.company,
        company_type: profile.company_type, // Added company type field
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
  async createProfile(name: string, role: UserRole): Promise<{ user: AuthUser | null; error: string | null }> {
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
  async updateProfile(userId: string, updates: any): Promise<{ user: AuthUser | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', userId)
        .select()
        .single()

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

      // Check if user profile exists
      console.log('Checking if profile exists in database...');
      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single()

      if (profileError) {
        console.log('Profile not found, creating from metadata...');
        // Profile doesn't exist, try to create it from metadata
        const metadata = user.user_metadata
        if (metadata?.name && metadata?.role) {
          console.log('Creating profile with metadata:', { name: metadata.name, role: metadata.role });
          const { data: newProfile, error: createError } = await supabase
            .from('users')
            .insert({
              id: user.id,
              email: user.email,
              name: metadata.name,
              role: metadata.role,
              startup_name: metadata.startupName || null,
              registration_date: new Date().toISOString().split('T')[0]
            })
            .select()
            .single()

          if (createError) {
            console.error('Error creating profile from metadata:', createError);
            return { user: null, error: 'Failed to create profile from metadata' }
          }

          console.log('Profile created successfully:', newProfile);
          // If role is Startup and startup_name was provided in metadata, ensure a startups row exists
          try {
            if (metadata.role === 'Startup' && metadata.startupName) {
              const { data: existingStartup } = await supabase
                .from('startups')
                .select('id')
                .eq('name', metadata.startupName)
                .single();

              if (!existingStartup) {
                await supabase
                  .from('startups')
                  .insert({
                    name: metadata.startupName,
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
                  });
              }
            }
          } catch (e) {
            console.warn('Failed to ensure startup row during email confirmation (non-blocking):', e);
          }
          console.log('=== EMAIL CONFIRMATION END ===');
          return {
            user: {
              id: newProfile.id,
              email: newProfile.email,
              name: newProfile.name,
              role: newProfile.role,
              registration_date: newProfile.registration_date
            },
            error: null
          }
        } else {
          console.error('No metadata found:', metadata);
          return { user: null, error: 'No metadata found to create profile' }
        }
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

      // Get user profile
      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('id', session.user.id)
        .single()

      if (profileError || !profile) {
        return { user: null, error: 'Profile not found' }
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
      console.error('Error refreshing session:', error)
      return { user: null, error: 'An unexpected error occurred' }
    }
  },

  // Check if email exists
  async checkEmailExists(email: string): Promise<{ exists: boolean; error?: string }> {
    try {
      console.log('Checking if email exists:', email);
      
      // Check our users table directly - this is more reliable and doesn't require admin privileges
      const { data: profiles, error: profileError } = await supabase
        .from('users')
        .select('id')
        .eq('email', email);

      if (profileError) {
        console.error('Error checking users table:', profileError);
        return { exists: false, error: 'Unable to check email availability' };
      }

      // Check if any profiles were returned
      if (profiles && profiles.length > 0) {
        console.log('Email already exists:', email);
        return { exists: true };
      } else {
        console.log('Email is available:', email);
        return { exists: false };
      }
    } catch (error) {
      console.error('Error checking email existence:', error);
      return { exists: false, error: 'Unable to check email availability' };
    }
  }
}
