import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';
import crypto from 'crypto';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      startupName,
      contactEmail,
      contactName,
      mentorId,
      mentorCode,
      mentorName,
      redirectUrl
    } = req.body as {
      startupName: string;
      contactEmail: string;
      contactName?: string;
      mentorId: string;
      mentorCode: string;
      mentorName: string;
      redirectUrl?: string;
    };

    if (!startupName || !contactEmail || !mentorId || !mentorCode || !mentorName) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Get Supabase service role key from environment
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing Supabase configuration');
      return res.status(500).json({ 
        error: 'Server configuration error',
        details: 'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables.'
      });
    }

    // Create admin client with service role key
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Check if startup already exists on TMS
    const { data: existingStartupByEmail } = await supabaseAdmin
      .from('user_profiles')
      .select('auth_user_id, role, startup_name')
      .eq('email', contactEmail.toLowerCase().trim())
      .eq('role', 'Startup')
      .maybeSingle();

    let userId: string;
    let isNewUser = false;
    let isExistingTMSStartup = false;

    if (existingStartupByEmail) {
      // User/Startup already exists on TMS
      userId = existingStartupByEmail.auth_user_id;
      isExistingTMSStartup = true;
      console.log('Startup already exists on TMS:', userId);
    } else {
      // Check if user exists in auth (but not in user_profiles)
      let existingUser;
      try {
        const { data: usersData, error: listError } = await supabaseAdmin.auth.admin.listUsers();
        if (!listError && usersData?.users) {
          existingUser = usersData.users.find(u => u.email?.toLowerCase() === contactEmail.toLowerCase());
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
            name: contactName || startupName,
            role: 'Startup',
            startupName: startupName,
            source: 'mentor_invite',
            mentor_code_entered: mentorCode,
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
    const { data: existingProfile } = await supabaseAdmin
      .from('user_profiles')
      .select('id')
      .eq('auth_user_id', userId)
      .eq('role', 'Startup')
      .maybeSingle();

    if (!existingProfile) {
      // Create new profile
      const { data: newProfile, error: profileError } = await supabaseAdmin
        .from('user_profiles')
        .insert({
          auth_user_id: userId,
          email: contactEmail.toLowerCase().trim(),
          name: contactName || startupName,
          role: 'Startup',
          startup_name: startupName,
          mentor_code_entered: mentorCode,
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
          startup_name: startupName,
          mentor_code_entered: mentorCode
        })
        .eq('id', existingProfile.id);

      if (updateError) {
        console.error('Error updating user profile:', updateError);
      } else {
        console.log('User profile updated successfully:', existingProfile.id);
      }
    }

    // Create startup record if user is new
    if (isNewUser && !isExistingTMSStartup) {
      const { data: startupRecord, error: startupError } = await supabaseAdmin
        .from('startups')
        .insert({
          name: startupName,
          user_id: userId,
          mentor_code: mentorCode,
          investment_type: 'Pre-Seed',
          investment_value: 0,
          equity_allocation: 0,
          current_valuation: 0,
          sector: 'Technology',
          registration_date: new Date().toISOString().split('T')[0],
          compliance_status: 'Pending'
        })
        .select()
        .single();

      if (startupError) {
        console.error('Error creating startup record:', startupError);
      } else {
        console.log('Startup record created:', startupRecord?.id);
      }
    }

    // Send OTP email for invite
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
          mentor_code: mentorCode,
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
      
      const encodedEmail = encodeURIComponent(contactEmail.toLowerCase().trim());
      const resetLink = `${siteUrl}/?page=reset-password&mentorCode=${mentorCode}&email=${encodedEmail}`;

      const emailSubject = `Invitation to Join TrackMyStartup from ${mentorName}`;
      const emailText = [
        `Hello ${contactName || startupName},`,
        ``,
        `I'm ${mentorName}, and I'd like to invite ${startupName} to join TrackMyStartup - a comprehensive platform for startup growth and management.`,
        ``,
        `My Mentor Code: ${mentorCode}`,
        ``,
        `With TrackMyStartup, you'll get access to:`,
        `• Complete startup health tracking`,
        `• Financial modeling and projections`,
        `• Compliance management`,
        `• Investor relations`,
        `• Team management`,
        `• Fundraising tools`,
        `• And much more!`,
        ``,
        `You've been invited to TrackMyStartup.`,
        `Your OTP: ${code} (valid ${OTP_EXPIRY_MINUTES} minutes)`,
        ``,
        `Set your password here: ${resetLink}`,
        ``,
        `Steps:`,
        `1) Open the link above.`,
        `2) Enter your email, the OTP, and a new password.`,
        `3) Continue to complete your registration.`,
        ``,
        `Join us on TrackMyStartup to take your startup to the next level.`,
        ``,
        `Best regards,`,
        `${mentorName}`
      ].join('\n');

      const emailHtml = `
        <p>Hello ${contactName || startupName},</p>
        <p>I'm <strong>${mentorName}</strong>, and I'd like to invite <strong>${startupName}</strong> to join TrackMyStartup - a comprehensive platform for startup growth and management.</p>
        <p><strong>My Mentor Code: ${mentorCode}</strong></p>
        <p>With TrackMyStartup, you'll get access to:</p>
        <ul>
          <li>Complete startup health tracking</li>
          <li>Financial modeling and projections</li>
          <li>Compliance management</li>
          <li>Investor relations</li>
          <li>Team management</li>
          <li>Fundraising tools</li>
          <li>And much more!</li>
        </ul>
        <p>You've been invited to TrackMyStartup.</p>
        <p>Your OTP: <b>${code}</b> (valid ${OTP_EXPIRY_MINUTES} minutes)</p>
        <p>Set your password here: <a href="${resetLink}">${resetLink}</a></p>
        <p><b>Steps:</b></p>
        <ol>
          <li>Open the link above.</li>
          <li>Enter your email, the OTP, and a new password.</li>
          <li>Continue to complete your registration.</li>
        </ol>
        <p>Join us on TrackMyStartup to take your startup to the next level.</p>
        <p>Best regards,<br><strong>${mentorName}</strong></p>
      `;

      const info = await transporter.sendMail({
        from: `${fromName} <${fromAddress}>`,
        to: contactEmail,
        subject: emailSubject,
        text: emailText,
        html: emailHtml
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
      isExistingTMSStartup,
      message: isExistingTMSStartup 
        ? 'Startup already exists on TMS and has been linked to your account' 
        : isNewUser 
          ? 'Invite OTP sent successfully' 
          : 'User already exists, linked to mentor (OTP sent)'
    });
  } catch (error: any) {
    console.error('Error in invite-startup-mentor:', error);
    console.error('Error stack:', error.stack);
    return res.status(500).json({ 
      error: error.message || 'Internal server error',
      details: error.details || error.hint || 'No additional details available'
    });
  }
}

