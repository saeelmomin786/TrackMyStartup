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
      // Check if auth user already exists
      const { data: existingAuthUser } = await supabaseAdmin.auth.admin.getUserByEmail(email.toLowerCase().trim());
      
      let authUserId: string;
      
      if (existingAuthUser?.user) {
        // User exists, check if they already have this role profile
        authUserId = existingAuthUser.user.id;
        const { data: existingProfile } = await supabaseAdmin
          .from('user_profiles')
          .select('id')
          .eq('auth_user_id', authUserId)
          .eq('role', role || 'Investor')
          .maybeSingle();
        
        if (existingProfile?.id) {
          return res.status(400).json({ error: `You already have a ${role || 'Investor'} profile. Please sign in instead.` });
        }
      } else {
        // Create new auth user
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
        if (createError || !created?.user) {
          console.error('Error creating user via admin:', createError);
          return res.status(500).json({ error: 'Failed to create user' });
        }
        authUserId = created.user.id;
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
      // Resolve user id for forgot/invite - use auth.users instead of users table
      if (!userId) {
        // Get auth user by email
        const { data: authUserData, error: authUserError } = await supabaseAdmin.auth.admin.getUserByEmail(email.toLowerCase().trim());
        if (authUserError || !authUserData?.user) {
          return res.status(404).json({ error: 'User not found' });
        }
        userId = authUserData.user.id;
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

