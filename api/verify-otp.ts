import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

// Code generation functions (simple implementations for server-side)
function generateInvestorCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = 'INV-';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function generateInvestmentAdvisorCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = 'IA-';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function generateMentorCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = 'MEN-';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

const MAX_ATTEMPTS = 5;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, code, newPassword, purpose, advisorCode, name, role, startupName, centerName, firmName, investmentAdvisorCode } = req.body as {
      email: string;
      code: string;
      newPassword: string;
      purpose: 'invite' | 'forgot' | 'register';
      advisorCode?: string;
      name?: string;
      role?: string;
      startupName?: string;
      centerName?: string;
      firmName?: string;
      investmentAdvisorCode?: string;
    };

    if (!email || !code || !newPassword || !purpose) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return res.status(500).json({ error: 'Server configuration error: missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY' });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Find OTP
    const { data: otpRow, error: otpError } = await supabaseAdmin
      .from('password_otps')
      .select('*')
      .eq('email', email.toLowerCase().trim())
      .eq('code', code)
      .eq('purpose', purpose)
      .is('used_at', null)
      .lte('attempts', MAX_ATTEMPTS)
      .gte('expires_at', new Date().toISOString())
      .maybeSingle();

    if (otpError || !otpRow) {
      return res.status(400).json({ error: 'Invalid or expired OTP' });
    }

    if (advisorCode && otpRow.advisor_code && otpRow.advisor_code !== advisorCode) {
      return res.status(400).json({ error: 'Invalid OTP for this advisor' });
    }

    // Increment attempts
    const { error: attemptError } = await supabaseAdmin
      .from('password_otps')
      .update({ attempts: (otpRow.attempts || 0) + 1 })
      .eq('id', otpRow.id);
    if (attemptError) {
      console.error('Error updating attempts:', attemptError);
    }

    let userId = otpRow.user_id;

    if (purpose === 'register') {
      // Efficient approach: Try to create user first, if it fails with "already exists", 
      // then we know user exists and can check for existing profiles
      // This avoids listing all users (which is inefficient with many users)
      let authUserId: string | null = null;
      
      // First check user_profiles table efficiently (indexed query)
      // This is much faster than listing all auth users
      const { data: existingProfileByEmail } = await supabaseAdmin
        .from('user_profiles')
        .select('auth_user_id, role')
        .eq('email', email.toLowerCase().trim())
        .eq('role', role || 'Investor')
        .maybeSingle();
      
      if (existingProfileByEmail?.auth_user_id) {
        return res.status(400).json({ error: `You already have a ${role || 'Investor'} profile. Please sign in instead.` });
      }
      
      // If profile doesn't exist, try to create auth user
      // If user already exists in auth but has different role profile, we'll handle that
      const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: email.toLowerCase().trim(),
        password: newPassword,
        email_confirm: true,
        user_metadata: {
          name,
          role,
          startupName,
          centerName,
          firmName,
          investment_advisor_code_entered: investmentAdvisorCode || advisorCode || null,
          source: 'otp_register'
        }
      });
      
      if (createError) {
        // Check if error is because user already exists
        const errorMessage = createError.message?.toLowerCase() || '';
        if (errorMessage.includes('already registered') || 
            errorMessage.includes('already exists') || 
            errorMessage.includes('user already') ||
            createError.status === 422) {
          // User exists in auth but might not have this role profile
          // Query user_profiles to get auth_user_id for existing user
          const { data: anyProfile } = await supabaseAdmin
            .from('user_profiles')
            .select('auth_user_id')
            .eq('email', email.toLowerCase().trim())
            .limit(1)
            .maybeSingle();
          
          if (anyProfile && (anyProfile as any).auth_user_id) {
            authUserId = (anyProfile as any).auth_user_id;
            // Check if this specific role profile exists
            const { data: roleProfile } = await supabaseAdmin
              .from('user_profiles')
              .select('id')
              .eq('auth_user_id', authUserId)
              .eq('role', role || 'Investor')
              .maybeSingle();
            
            if (roleProfile?.id) {
              return res.status(400).json({ error: `You already have a ${role || 'Investor'} profile. Please sign in instead.` });
            }
            // User exists but doesn't have this role profile - update password and create profile below
            // CRITICAL: Update password for existing user so they can login
            const { error: passwordUpdateError } = await supabaseAdmin.auth.admin.updateUserById(authUserId, {
              password: newPassword,
            });
            if (passwordUpdateError) {
              console.error('Error updating password for existing user:', passwordUpdateError);
              return res.status(500).json({ error: 'Failed to set password. Please try again.' });
            }
            console.log('✅ Updated password for existing user during registration');
          } else {
            // User exists in auth but has no profiles yet - this shouldn't happen normally
            // But we'll handle it by trying to get auth_user_id via listUsers (only as fallback)
            console.warn('User exists in auth but no profiles found, using fallback lookup');
            try {
              const { data: usersData } = await supabaseAdmin.auth.admin.listUsers();
              if (usersData?.users) {
                const foundUser = usersData.users.find((u: any) => u.email?.toLowerCase() === email.toLowerCase().trim());
                if (foundUser) {
                  authUserId = foundUser.id;
                  // CRITICAL: Update password for existing user so they can login
                  const { error: passwordUpdateError } = await supabaseAdmin.auth.admin.updateUserById(authUserId, {
                    password: newPassword,
                  });
                  if (passwordUpdateError) {
                    console.error('Error updating password for existing user:', passwordUpdateError);
                    return res.status(500).json({ error: 'Failed to set password. Please try again.' });
                  }
                  console.log('✅ Updated password for existing user during registration (fallback)');
                }
              }
            } catch (fallbackError) {
              console.error('Fallback lookup failed:', fallbackError);
            }
            
            if (!authUserId) {
              return res.status(500).json({ error: 'Account exists but could not be found. Please contact support.' });
            }
          }
        } else {
          // Different error, return it
          console.error('Error creating user via admin:', createError);
          return res.status(500).json({ error: createError.message || 'Failed to create user account' });
        }
      } else if (created?.user) {
        // Successfully created new auth user
        authUserId = created.user.id;
      } else {
        return res.status(500).json({ error: 'Failed to create user account' });
      }

      // Generate codes based on role
      const investorCode = role === 'Investor' ? generateInvestorCode() : null;
      const investmentAdvisorCodeValue = role === 'Investment Advisor' ? generateInvestmentAdvisorCode() : null;
      const mentorCode = role === 'Mentor' ? generateMentorCode() : null;

      // Create user_profiles entry
      const { data: newProfile, error: profileError } = await supabaseAdmin
        .from('user_profiles')
        .insert({
          auth_user_id: authUserId,
          email: email.toLowerCase().trim(),
          name: name || '',
          role: role || 'Investor',
          startup_name: role === 'Startup' ? startupName || null : null,
          center_name: role === 'Startup Facilitation Center' ? centerName || null : null,
          firm_name: role === 'Investment Advisor' ? firmName || null : null,
          investor_code: investorCode,
          investment_advisor_code: investmentAdvisorCodeValue,
          mentor_code: mentorCode,
          investment_advisor_code_entered: investmentAdvisorCode || advisorCode || null,
          registration_date: new Date().toISOString().split('T')[0],
          is_profile_complete: false
        })
        .select()
        .single();
      
      if (profileError) {
        console.error('Error creating user profile:', profileError);
        return res.status(500).json({ error: 'Failed to create user profile' });
      }

      // Set this profile as the active profile for the user
      const { error: sessionError } = await supabaseAdmin
        .from('user_profile_sessions')
        .upsert({
          auth_user_id: authUserId,
          current_profile_id: newProfile.id,
          updated_at: new Date().toISOString()
        }, { onConflict: 'auth_user_id' });
      
      if (sessionError) {
        console.error('Error setting active profile:', sessionError);
        // Don't fail registration if session update fails
      }
      
      userId = authUserId; // Set userId for OTP marking
    } else {
      // Resolve user id for forgot/invite
      if (!userId) {
        // Efficient approach: Check user_profiles table first (indexed query)
        // This is much faster than listing all auth users
        const { data: profileData } = await supabaseAdmin
          .from('user_profiles')
          .select('auth_user_id')
          .eq('email', email.toLowerCase().trim())
          .limit(1)
          .maybeSingle();
        
        if (profileData?.auth_user_id) {
          userId = profileData.auth_user_id;
        } else {
          // Fallback: User might exist in auth but not in user_profiles (shouldn't happen but handle it)
          // Use listUsers (fallback only - should rarely be needed)
          try {
            const { data: usersData, error: listError } = await supabaseAdmin.auth.admin.listUsers();
            if (listError || !usersData?.users) {
              return res.status(404).json({ error: 'User not found' });
            }
            const authUser = usersData.users.find((u: any) => u.email?.toLowerCase() === email.toLowerCase().trim());
            if (!authUser) {
              return res.status(404).json({ error: 'User not found' });
            }
            userId = authUser.id;
          } catch (error) {
            console.error('Error finding user:', error);
            return res.status(404).json({ error: 'User not found' });
          }
        }
      }

      // Update password via admin API
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        password: newPassword,
      });
      if (updateError) {
        console.error('Error updating password:', updateError);
        return res.status(500).json({ error: 'Failed to update password' });
      }
    }

    // Mark OTP used
    const { error: useError } = await supabaseAdmin
      .from('password_otps')
      .update({ used_at: new Date().toISOString() })
      .eq('id', otpRow.id);
    if (useError) {
      console.error('Error marking OTP used:', useError);
    }

    return res.status(200).json({ success: true });
  } catch (error: any) {
    console.error('Error in verify-otp:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}

