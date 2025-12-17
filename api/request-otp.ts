import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';

const OTP_EXPIRY_MINUTES = 10;
const OTP_LENGTH = 6;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, purpose, advisorCode } = req.body as { email: string; purpose: 'invite' | 'forgot' | 'register'; advisorCode?: string };

    if (!email || !purpose) {
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

    // Lookup user id from auth.users (only for forgot/invite)
    let userId = null;
    if (purpose !== 'register') {
      // Get auth user by email
      const { data: authUserData, error: authUserError } = await supabaseAdmin.auth.admin.getUserByEmail(email.toLowerCase().trim());
      
      if (purpose === 'forgot' && (!authUserData?.user || authUserError)) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      userId = authUserData?.user?.id || null;
    }

    const code = Math.floor(10 ** (OTP_LENGTH - 1) + Math.random() * 9 * 10 ** (OTP_LENGTH - 1)).toString();
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000).toISOString();

    const { error: insertError } = await supabaseAdmin.from('password_otps').insert({
      email: email.toLowerCase().trim(),
      user_id: userId || null,
      code,
      purpose,
      advisor_code: advisorCode || null,
      expires_at: expiresAt,
    });

    if (insertError) {
      console.error('Error inserting OTP:', insertError);
      return res.status(500).json({ error: 'Failed to generate OTP' });
    }

    // Send email via SMTP
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

    await transporter.sendMail({
      from: `${fromName} <${fromAddress}>`,
      to: email,
      subject: 'Your OTP Code',
      text: `Your OTP code is ${code}. It expires in ${OTP_EXPIRY_MINUTES} minutes.`,
      html: `<p>Your OTP code is <b>${code}</b>. It expires in ${OTP_EXPIRY_MINUTES} minutes.</p>`,
    });

    return res.status(200).json({ success: true });
  } catch (error: any) {
    console.error('Error in request-otp:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}

