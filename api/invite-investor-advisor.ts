import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';
import crypto from 'crypto';

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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      investorId,
      advisorId,
      advisorCode,
      investorName,
      contactEmail,
      contactName,
      redirectUrl
    } = req.body as {
      investorId: number;
      advisorId: string;
      advisorCode: string;
      investorName: string;
      contactEmail: string;
      contactName: string;
      redirectUrl?: string;
    };

    if (!investorId || !advisorId || !advisorCode || !investorName || !contactEmail || !contactName) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Get Supabase service role key from environment
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing Supabase configuration');
      return res.status(500).json({ 
        error: 'Server configuration error',
        details: 'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables'
      });
    }

    // Create admin client with service role key
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // First check if investor already exists on TMS - check user_profiles instead of users
    const { data: existingInvestorByEmail } = await supabaseAdmin
      .from('user_profiles')
      .select('auth_user_id, role, investment_advisor_code_entered')
      .eq('email', contactEmail.toLowerCase().trim())
      .eq('role', 'Investor')
      .maybeSingle();

    let existingInvestorId: number | null = null;
    let userId: string;
    let isNewUser = false;
    let isExistingTMSInvestor = false;

    if (existingInvestorByEmail) {
      // User/Investor already exists on TMS
      userId = existingInvestorByEmail.auth_user_id; // Use auth_user_id, not profile id
      isExistingTMSInvestor = true;
      console.log('Investor already exists on TMS:', userId);

      // Find investor record (user_id in investors table is auth_user_id)
      const { data: investorRecord } = await supabaseAdmin
        .from('investors')
        .select('id, investment_advisor_code')
        .eq('user_id', userId)
        .maybeSingle();

      if (investorRecord) {
        existingInvestorId = investorRecord.id;

        // Check if advisor code is already set (already linked)
        if (existingInvestorByEmail.investment_advisor_code_entered === advisorCode) {
          // Already linked to this advisor - treat as re-invite
          console.log('Investor already linked to this advisor; sending OTP re-invite');
          isExistingTMSInvestor = false;
        } else if (existingInvestorByEmail.investment_advisor_code_entered && existingInvestorByEmail.investment_advisor_code_entered !== advisorCode) {
          // Investor is already linked to a different advisor
          const { data: existingAdvisorData } = await supabaseAdmin
            .from('user_profiles')
            .select('name, email, investment_advisor_code')
            .eq('investment_advisor_code', existingInvestorByEmail.investment_advisor_code_entered)
            .eq('role', 'Investment Advisor')
            .maybeSingle();

          // Update advisor_added_investors record to show conflict
          await supabaseAdmin
            .from('advisor_added_investors')
            .update({
              is_on_tms: false,
              tms_investor_id: investorRecord.id.toString()
            })
            .eq('id', investorId);

          return res.status(200).json({
            success: false,
            alreadyHasAdvisor: true,
            existingAdvisorName: existingAdvisorData?.name || 'Another Investment Advisor',
            existingAdvisorCode: existingInvestorByEmail.investment_advisor_code_entered,
            userId,
            isExistingTMSInvestor: true,
            tmsInvestorId: investorRecord.id,
            message: `This investor is already linked with another Investment Advisor (${existingAdvisorData?.name || 'Unknown'}). Please contact the investor directly to change their Investment Advisor code.`
          });
        }
      }
    } else {
      // Check if user exists in auth (but not in users table)
      let existingUser;
      try {
        const { data: usersData, error: listError } = await supabaseAdmin.auth.admin.listUsers();
        if (!listError && usersData?.users) {
          existingUser = usersData.users.find((u: any) => u.email?.toLowerCase() === contactEmail.toLowerCase());
        }
      } catch (authError: any) {
        console.log('No existing user in auth (this is OK for new users):', authError.message);
        existingUser = null;
      }

      if (existingUser) {
        userId = existingUser.id;
        console.log('User exists in auth:', userId);
      } else {
        // Create new user via admin (OTP flow)
        const { data: createdUser, error: createErr } = await supabaseAdmin.auth.admin.createUser({
          email: contactEmail.toLowerCase().trim(),
          password: crypto.randomBytes(12).toString('hex'), // temp password; will be replaced via OTP
          email_confirm: true,
          user_metadata: {
            name: contactName,
            role: 'Investor',
            source: 'advisor_invite',
            investment_advisor_code_entered: advisorCode,
            skip_form1: true
          }
        });

        if (createErr || !createdUser?.user) {
          console.error('Error creating user via admin:', createErr);
          return res.status(500).json({ error: 'Failed to create user for invite' });
        }

        userId = createdUser.user.id;
        isNewUser = true;
        console.log('✅ User created for invite (OTP flow):', userId);
      }
    }

    // Create or update user profile in user_profiles table
    // Check if profile already exists for this auth user
    const { data: existingProfile } = await supabaseAdmin
      .from('user_profiles')
      .select('id')
      .eq('auth_user_id', userId)
      .eq('role', 'Investor')
      .maybeSingle();

    if (!existingProfile) {
      // Generate investor code
      const investorCode = generateInvestorCode();
      
      // Create new profile
      const { data: newProfile, error: profileError } = await supabaseAdmin
        .from('user_profiles')
        .insert({
          auth_user_id: userId,
          email: contactEmail.toLowerCase().trim(),
          name: contactName,
          role: 'Investor',
          investor_code: investorCode,
          investment_advisor_code_entered: advisorCode,
          registration_date: new Date().toISOString().split('T')[0],
          is_profile_complete: false
        })
        .select()
        .single();

      if (profileError) {
        console.error('Error creating user profile:', profileError);
        return res.status(500).json({ 
          error: 'Failed to create user profile',
          details: profileError.message || profileError.details || 'Unknown error'
        });
      }

      console.log('User profile created successfully:', newProfile?.id);
      
      // Set as active profile if this is a new user
      if (isNewUser) {
        await supabaseAdmin
          .from('user_profile_sessions')
          .upsert({
            auth_user_id: userId,
            current_profile_id: newProfile.id,
            updated_at: new Date().toISOString()
          }, { onConflict: 'auth_user_id' });
      }
    } else {
      // Update existing profile
      const { error: updateError } = await supabaseAdmin
        .from('user_profiles')
        .update({
          investment_advisor_code_entered: advisorCode
        })
        .eq('id', existingProfile.id);

      if (updateError) {
        console.error('Error updating user profile:', updateError);
      } else {
        console.log('User profile updated successfully:', existingProfile.id);
      }
    }

    // Create investor record if user is new (and doesn't already exist)
    if (isNewUser && !existingInvestorId) {
      const { data: investorRecord, error: investorError } = await supabaseAdmin
        .from('investors')
        .insert({
          user_id: userId,
          investment_advisor_code: advisorCode,
          firm_name: investorName,
          compliance_status: 'Pending'
        })
        .select()
        .single();

      if (investorError) {
        console.error('Error creating investor record:', investorError);
        // Don't fail the whole operation, just log it
      } else {
        console.log('Investor record created:', investorRecord?.id);
        existingInvestorId = investorRecord.id;
      }
    }

    // Update advisor_added_investors record
    const updateData: any = {};

    if (isExistingTMSInvestor) {
      // Investor already on TMS - mark as linked
      updateData.is_on_tms = true;
      updateData.tms_investor_id = existingInvestorId?.toString();
    }

    const { error: updateError } = await supabaseAdmin
      .from('advisor_added_investors')
      .update(updateData)
      .eq('id', investorId);

    if (updateError) {
      console.error('Error updating advisor_added_investors:', updateError);
      return res.status(500).json({ error: 'Failed to update invite status' });
    }

    // Send OTP email for invite (OTP-only flow)
    try {
      const OTP_EXPIRY_MINUTES = 10;
      const OTP_LENGTH = 6;
      const code = Math.floor(10 ** (OTP_LENGTH - 1) + Math.random() * 9 * 10 ** (OTP_LENGTH - 1)).toString();
      const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000).toISOString();

      const { error: otpInsertError } = await supabaseAdmin
        .from('password_otps')
        .insert({
          email: contactEmail.toLowerCase().trim(),
          user_id: userId,
          code,
          purpose: 'invite',
          advisor_code: advisorCode,
          expires_at: expiresAt
        });

      if (otpInsertError) {
        console.error('Error inserting invite OTP:', otpInsertError);
        return res.status(500).json({ error: 'Failed to generate invite OTP' });
      }

      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT || 587),
        secure: Number(process.env.SMTP_PORT || 587) === 465,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });

      const fromAddress = process.env.SMTP_FROM || process.env.SMTP_USER;
      const fromName = process.env.SMTP_FROM_NAME || 'TrackMyStartup';

      let siteUrl = redirectUrl;
      if (!siteUrl) {
        const isDevelopment = process.env.NODE_ENV === 'development' || 
                             !process.env.VERCEL_ENV ||
                             process.env.VITE_SITE_URL?.includes('localhost');
        siteUrl = isDevelopment 
          ? 'http://localhost:5173'
          : (process.env.VITE_SITE_URL || process.env.SITE_URL || 'https://trackmystartup.com');
      }
      // Include email in the invite link so it can be auto-filled and locked
      const encodedEmail = encodeURIComponent(contactEmail.toLowerCase().trim());
      const resetLink = `${siteUrl}/?page=reset-password&advisorCode=${advisorCode}&email=${encodedEmail}`;

      const info = await transporter.sendMail({
        from: `${fromName} <${fromAddress}>`,
        to: contactEmail,
        subject: 'Your TrackMyStartup invite OTP',
        text: [
          `You've been invited to TrackMyStartup.`,
          `Your OTP: ${code} (valid ${OTP_EXPIRY_MINUTES} minutes)`,
          ``,
          `Set your password here: ${resetLink}`,
          `Steps:`,
          `1) Open the link above.`,
          `2) Enter your email, the OTP, and a new password.`,
          `3) Continue to complete your registration.`
        ].join('\n'),
        html: `
          <p>You've been invited to TrackMyStartup.</p>
          <p>Your OTP: <b>${code}</b> (valid ${OTP_EXPIRY_MINUTES} minutes)</p>
          <p>Set your password here: <a href="${resetLink}">${resetLink}</a></p>
          <p><b>Steps:</b></p>
          <ol>
            <li>Open the link above.</li>
            <li>Enter your email, the OTP, and a new password.</li>
            <li>Continue to complete your registration.</li>
          </ol>
        `
      });

      console.log('📧 Invite OTP sent to:', contactEmail, 'accepted:', info.accepted, 'response:', info.response);
    } catch (otpErr) {
      console.error('Error sending invite OTP:', otpErr);
      return res.status(500).json({ error: 'Failed to send invite OTP' });
    }

    return res.status(200).json({
      success: true,
      userId,
      isNewUser,
      isExistingTMSInvestor,
      tmsInvestorId: existingInvestorId,
      message: isExistingTMSInvestor 
        ? 'Investor already exists on TMS and has been linked to your account' 
        : isNewUser 
          ? 'Invite OTP sent successfully' 
          : 'User already exists, linked to advisor (OTP sent)'
    });
  } catch (error: any) {
    console.error('Error in invite-investor-advisor:', error);
    return res.status(500).json({ 
      error: error.message || 'Internal server error',
      details: error.details || error.hint || 'No additional details available'
    });
  }
}

