import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';
import crypto from 'crypto';

// Code generation functions
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
    const { type } = req.body as { type: 'startup-advisor' | 'investor-advisor' | 'startup-mentor' | 'center' | 'investor' };

    // Handle startup-mentor (simple email-only flow)
    if (type === 'startup-mentor') {
      const {
        startupName,
        contactEmail,
        contactName,
        mentorCode,
        mentorName
      } = req.body as {
        startupName: string;
        contactEmail: string;
        contactName?: string;
        mentorCode: string;
        mentorName: string;
      };

      if (!startupName || !contactEmail || !mentorCode || !mentorName) {
        return res.status(400).json({ error: 'Missing required fields' });
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

      let siteUrl = process.env.VITE_SITE_URL || process.env.SITE_URL || 'https://trackmystartup.com';
      if (process.env.NODE_ENV === 'development' || process.env.VITE_SITE_URL?.includes('localhost')) {
        siteUrl = 'http://localhost:5173';
      }

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
        `To join TrackMyStartup, please visit: ${siteUrl}`,
        ``,
        `When you register, make sure to use my Mentor Code: ${mentorCode}`,
        ``,
        `Join us on TrackMyStartup to take your startup to the next level.`,
        ``,
        `Best regards,`,
        `${mentorName}`
      ].join('\n');

      const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
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
          <p>To join TrackMyStartup, please visit: <a href="${siteUrl}">${siteUrl}</a></p>
          <p>When you register, make sure to use my <strong>Mentor Code: ${mentorCode}</strong></p>
          <p>Join us on TrackMyStartup to take your startup to the next level.</p>
          <p>Best regards,<br><strong>${mentorName}</strong></p>
        </div>
      `;

      const info = await transporter.sendMail({
        from: `${fromName} <${fromAddress}>`,
        to: contactEmail,
        subject: emailSubject,
        text: emailText,
        html: emailHtml
      });

      console.log('📧 Invitation email sent to:', contactEmail, 'accepted:', info.accepted, 'response:', info.response);

      return res.status(200).json({
        success: true,
        message: 'Invitation email sent successfully'
      });
    }

    // Handle startup-advisor and investor-advisor (complex flows with user creation)
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return res.status(500).json({
        error: 'Server configuration error',
        details: 'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables'
      });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    if (type === 'startup-advisor') {
      const {
        startupId,
        advisorId,
        advisorCode,
        startupName,
        contactEmail,
        contactName,
        redirectUrl
      } = req.body as {
        startupId: number;
        advisorId: string;
        advisorCode: string;
        startupName: string;
        contactEmail: string;
        contactName: string;
        redirectUrl?: string;
      };

      if (!startupId || !advisorId || !advisorCode || !startupName || !contactEmail || !contactName) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      const { data: existingStartupByEmail } = await supabaseAdmin
        .from('user_profiles')
        .select('auth_user_id, role, startup_name, investment_advisor_code_entered')
        .eq('email', contactEmail.toLowerCase().trim())
        .eq('role', 'Startup')
        .maybeSingle();

      let existingStartupId: number | null = null;
      let userId: string;
      let isNewUser = false;
      let isExistingTMSStartup = false;

      if (existingStartupByEmail) {
        userId = existingStartupByEmail.auth_user_id;
        isExistingTMSStartup = true;

        const { data: startupRecord } = await supabaseAdmin
          .from('startups')
          .select('id, investment_advisor_code')
          .eq('user_id', userId)
          .maybeSingle();

        if (startupRecord) {
          existingStartupId = startupRecord.id;

          if (existingStartupByEmail.investment_advisor_code_entered === advisorCode) {
            isExistingTMSStartup = false;
          } else if (existingStartupByEmail.investment_advisor_code_entered && existingStartupByEmail.investment_advisor_code_entered !== advisorCode) {
            const { data: existingAdvisorData } = await supabaseAdmin
              .from('user_profiles')
              .select('name, email, investment_advisor_code')
              .eq('investment_advisor_code', existingStartupByEmail.investment_advisor_code_entered)
              .eq('role', 'Investment Advisor')
              .maybeSingle();

            await supabaseAdmin
              .from('advisor_added_startups')
              .update({
                is_on_tms: false,
                tms_startup_id: startupRecord.id,
                invite_status: 'not_sent'
              })
              .eq('id', startupId);

            return res.status(200).json({
              success: false,
              requiresPermission: false,
              alreadyHasAdvisor: true,
              existingAdvisorName: existingAdvisorData?.name || 'Another Investment Advisor',
              existingAdvisorCode: existingStartupByEmail.investment_advisor_code_entered,
              userId,
              isExistingTMSStartup: true,
              tmsStartupId: startupRecord.id,
              message: `This startup is already linked with another Investment Advisor (${existingAdvisorData?.name || 'Unknown'}). Please contact the startup directly to change their Investment Advisor code.`
            });
          } else {
            const { data: advisorData } = await supabaseAdmin
              .from('user_profiles')
              .select('investment_advisor_code, name, email')
              .eq('auth_user_id', advisorId)
              .eq('role', 'Investment Advisor')
              .maybeSingle();

            const hasDifferentAdvisor = existingStartupByEmail.investment_advisor_code_entered &&
              existingStartupByEmail.investment_advisor_code_entered !== advisorCode;

            let requestMessage = `Investment Advisor "${advisorData?.name || 'Unknown'}" wants to link your startup "${startupName}" to their account.`;

            if (hasDifferentAdvisor) {
              const { data: existingAdvisorData } = await supabaseAdmin
                .from('user_profiles')
                .select('name')
                .eq('investment_advisor_code', existingStartupByEmail.investment_advisor_code_entered)
                .eq('role', 'Investment Advisor')
                .maybeSingle();

              requestMessage = `Investment Advisor "${advisorData?.name || 'Unknown'}" wants to link your startup "${startupName}" to their account. Note: You are currently managed by ${existingAdvisorData?.name || 'another Investment Advisor'}. Approving this request will switch your advisor.`;
            }

            try {
              await supabaseAdmin
                .from('advisor_startup_link_requests')
                .insert({
                  advisor_id: advisorId,
                  advisor_code: advisorCode,
                  advisor_name: advisorData?.name,
                  advisor_email: advisorData?.email,
                  startup_id: startupRecord.id,
                  startup_name: startupName,
                  startup_user_id: userId,
                  startup_email: contactEmail,
                  advisor_added_startup_id: startupId,
                  status: 'pending',
                  message: requestMessage
                });
            } catch (requestError: any) {
              console.error('Error creating permission request:', requestError);
            }

            await supabaseAdmin
              .from('advisor_added_startups')
              .update({
                is_on_tms: false,
                tms_startup_id: startupRecord.id,
                invite_status: 'not_sent'
              })
              .eq('id', startupId);

            return res.status(200).json({
              success: true,
              requiresPermission: true,
              userId,
              isExistingTMSStartup: true,
              tmsStartupId: startupRecord.id,
              message: 'Startup already exists on TMS. A permission request has been sent to the startup.'
            });
          }
        }
      } else {
        let existingUser;
        try {
          const { data: usersData, error: listError } = await supabaseAdmin.auth.admin.listUsers();
          if (!listError && usersData?.users) {
            existingUser = usersData.users.find((u: any) => u.email?.toLowerCase() === contactEmail.toLowerCase());
          }
        } catch (authError: any) {
          existingUser = null;
        }

        if (existingUser) {
          userId = existingUser.id;
        } else {
          const { data: createdUser, error: createErr } = await supabaseAdmin.auth.admin.createUser({
            email: contactEmail.toLowerCase().trim(),
            password: crypto.randomBytes(12).toString('hex'),
            email_confirm: true,
            user_metadata: {
              name: contactName,
              role: 'Startup',
              startupName: startupName,
              source: 'advisor_invite',
              investment_advisor_code_entered: advisorCode,
              skip_form1: true
            }
          });

          if (createErr || !createdUser?.user) {
            return res.status(500).json({ error: 'Failed to create user for invite' });
          }

          userId = createdUser.user.id;
          isNewUser = true;
        }
      }

      const { data: existingProfile } = await supabaseAdmin
        .from('user_profiles')
        .select('id')
        .eq('auth_user_id', userId)
        .eq('role', 'Startup')
        .maybeSingle();

      if (!existingProfile) {
        const { data: newProfile, error: profileError } = await supabaseAdmin
          .from('user_profiles')
          .insert({
            auth_user_id: userId,
            email: contactEmail.toLowerCase().trim(),
            name: contactName,
            role: 'Startup',
            startup_name: startupName,
            investment_advisor_code_entered: advisorCode,
            registration_date: new Date().toISOString().split('T')[0],
            is_profile_complete: false
          })
          .select()
          .single();

        if (profileError) {
          return res.status(500).json({
            error: 'Failed to create user profile',
            details: profileError.message || profileError.details || 'Unknown error'
          });
        }

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
        await supabaseAdmin
          .from('user_profiles')
          .update({
            startup_name: startupName,
            investment_advisor_code_entered: advisorCode
          })
          .eq('id', existingProfile.id);
      }

      if (isNewUser && !existingStartupId) {
        await supabaseAdmin
          .from('startups')
          .insert({
            name: startupName,
            user_id: userId,
            investment_advisor_code: advisorCode,
            investment_type: 'Pre-Seed',
            investment_value: 0,
            equity_allocation: 0,
            current_valuation: 0,
            sector: 'Technology',
            registration_date: new Date().toISOString().split('T')[0],
            compliance_status: 'Pending'
          });
      }

      const updateData: any = {
        invite_sent_at: new Date().toISOString()
      };

      if (isExistingTMSStartup) {
        updateData.is_on_tms = true;
        updateData.tms_startup_id = existingStartupId;
        updateData.invite_status = 'accepted';
      } else {
        updateData.invite_status = 'sent';
      }

      await supabaseAdmin
        .from('advisor_added_startups')
        .update(updateData)
        .eq('id', startupId);

      // Send OTP
      const OTP_EXPIRY_MINUTES = 10;
      const OTP_LENGTH = 6;
      const code = Math.floor(10 ** (OTP_LENGTH - 1) + Math.random() * 9 * 10 ** (OTP_LENGTH - 1)).toString();
      const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000).toISOString();

      await supabaseAdmin
        .from('password_otps')
        .insert({
          email: contactEmail.toLowerCase().trim(),
          user_id: userId,
          code,
          purpose: 'invite',
          advisor_code: advisorCode,
          expires_at: expiresAt
        });

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
      const resetLink = `${siteUrl}/?page=reset-password&advisorCode=${advisorCode}&email=${encodedEmail}`;

      await transporter.sendMail({
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

      return res.status(200).json({
        success: true,
        userId,
        isNewUser,
        isExistingTMSStartup,
        requiresPermission: false,
        tmsStartupId: existingStartupId,
        message: isExistingTMSStartup
          ? 'Startup already exists on TMS and has been linked to your account'
          : isNewUser
            ? 'Invite OTP sent successfully'
            : 'User already exists, linked to advisor (OTP sent)'
      });
    }

    if (type === 'investor-advisor') {
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
        userId = existingInvestorByEmail.auth_user_id;
        isExistingTMSInvestor = true;

        const { data: investorRecord } = await supabaseAdmin
          .from('investors')
          .select('id, investment_advisor_code')
          .eq('user_id', userId)
          .maybeSingle();

        if (investorRecord) {
          existingInvestorId = investorRecord.id;

          if (existingInvestorByEmail.investment_advisor_code_entered === advisorCode) {
            isExistingTMSInvestor = false;
          } else if (existingInvestorByEmail.investment_advisor_code_entered && existingInvestorByEmail.investment_advisor_code_entered !== advisorCode) {
            const { data: existingAdvisorData } = await supabaseAdmin
              .from('user_profiles')
              .select('name, email, investment_advisor_code')
              .eq('investment_advisor_code', existingInvestorByEmail.investment_advisor_code_entered)
              .eq('role', 'Investment Advisor')
              .maybeSingle();

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
        let existingUser;
        try {
          const { data: usersData, error: listError } = await supabaseAdmin.auth.admin.listUsers();
          if (!listError && usersData?.users) {
            existingUser = usersData.users.find((u: any) => u.email?.toLowerCase() === contactEmail.toLowerCase());
          }
        } catch (authError: any) {
          existingUser = null;
        }

        if (existingUser) {
          userId = existingUser.id;
        } else {
          const { data: createdUser, error: createErr } = await supabaseAdmin.auth.admin.createUser({
            email: contactEmail.toLowerCase().trim(),
            password: crypto.randomBytes(12).toString('hex'),
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
            return res.status(500).json({ error: 'Failed to create user for invite' });
          }

          userId = createdUser.user.id;
          isNewUser = true;
        }
      }

      const { data: existingProfile } = await supabaseAdmin
        .from('user_profiles')
        .select('id')
        .eq('auth_user_id', userId)
        .eq('role', 'Investor')
        .maybeSingle();

      if (!existingProfile) {
        const investorCode = generateInvestorCode();

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
          return res.status(500).json({
            error: 'Failed to create user profile',
            details: profileError.message || profileError.details || 'Unknown error'
          });
        }

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
        await supabaseAdmin
          .from('user_profiles')
          .update({
            investment_advisor_code_entered: advisorCode
          })
          .eq('id', existingProfile.id);
      }

      if (isNewUser && !existingInvestorId) {
        await supabaseAdmin
          .from('investors')
          .insert({
            user_id: userId,
            investment_advisor_code: advisorCode,
            firm_name: investorName,
            compliance_status: 'Pending'
          });
      }

      const updateData: any = {};
      if (isExistingTMSInvestor) {
        updateData.is_on_tms = true;
        updateData.tms_investor_id = existingInvestorId?.toString();
      }

      await supabaseAdmin
        .from('advisor_added_investors')
        .update(updateData)
        .eq('id', investorId);

      // Send OTP
      const OTP_EXPIRY_MINUTES = 10;
      const OTP_LENGTH = 6;
      const code = Math.floor(10 ** (OTP_LENGTH - 1) + Math.random() * 9 * 10 ** (OTP_LENGTH - 1)).toString();
      const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000).toISOString();

      await supabaseAdmin
        .from('password_otps')
        .insert({
          email: contactEmail.toLowerCase().trim(),
          user_id: userId,
          code,
          purpose: 'invite',
          advisor_code: advisorCode,
          expires_at: expiresAt
        });

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
      const resetLink = `${siteUrl}/?page=reset-password&advisorCode=${advisorCode}&email=${encodedEmail}`;

      await transporter.sendMail({
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
    }

    // Handle center/investor association invites (from send-invite)
    if (type === 'center' || type === 'investor') {
      const { kind, name, email, phone, startupName, appUrl } = req.body as {
        kind?: 'center' | 'investor';
        name: string;
        email: string;
        phone?: string;
        startupName?: string;
        appUrl?: string;
      };

      const inviteKind = kind || type;
      if (!['center', 'investor'].includes(inviteKind) || !name || !email) {
        return res.status(400).json({ error: 'Invalid payload' });
      }

      const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, FROM_EMAIL } = process.env as Record<string, string | undefined>;
      if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS) {
        return res.status(500).json({ success: false, error: 'Email not configured' });
      }

      const portNum = Number(SMTP_PORT || '465');
      const is465 = String(portNum) === '465';
      const transporter = nodemailer.createTransport({
        host: SMTP_HOST,
        port: portNum,
        secure: is465,
        requireTLS: !is465,
        auth: { user: SMTP_USER, pass: SMTP_PASS },
        authMethod: 'LOGIN',
        connectionTimeout: 15000,
        greetingTimeout: 10000,
        socketTimeout: 20000,
        tls: {
          ciphers: 'TLSv1.2',
          minVersion: 'TLSv1.2',
          rejectUnauthorized: false
        }
      } as any);

      try {
        await transporter.verify();
      } catch (verifyErr: any) {
        console.error('Transporter verify failed:', verifyErr?.message || verifyErr);
      }

      const roleLine = inviteKind === 'center' ? 'Incubation Center / Accelerator' : 'Investor';
      const subject = inviteKind === 'center'
        ? `Association details requested for ${startupName || 'a startup'}`
        : `Investment association details requested for ${startupName || 'a startup'}`;

      const registerUrl = appUrl ? `${appUrl}?page=register` : '';
      const text = [
        `Hello ${name},`,
        '',
        inviteKind === 'center'
          ? `${startupName || 'A startup'} is providing association details for your ${roleLine}.`
          : `${startupName || 'A startup'} is listing you as an ${roleLine} (grant, debt or equity).`,
        'If you are not yet on TrackMyStartup, you can register using the link below.',
        '',
        phone ? `Contact Number: ${phone}` : undefined,
        `Email: ${email}`,
        registerUrl ? `\nGet started: ${registerUrl}` : undefined,
        '',
        'Best regards,',
        'TrackMyStartup Support'
      ].filter(Boolean).join('\n');

      try {
        await transporter.sendMail({
          from: FROM_EMAIL || `TrackMyStartup Support <${SMTP_USER}>`,
          to: email,
          subject,
          text
        });
      } catch (sendErr: any) {
        console.error('Send mail failed:', sendErr?.code || sendErr?.message || sendErr);
        return res.status(500).json({ success: false, error: sendErr?.code || sendErr?.message || 'Email send failed' });
      }

      return res.status(200).json({ success: true });
    }

    return res.status(400).json({ error: 'Invalid invite type' });
  } catch (error: any) {
    console.error('Error in invite handler:', error);
    return res.status(500).json({
      error: error.message || 'Internal server error',
      details: error.details || error.hint || 'No additional details available'
    });
  }
}
