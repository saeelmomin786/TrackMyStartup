import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const MAX_ATTEMPTS = 5;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, code, newPassword, purpose, advisorCode } = req.body as {
      email: string;
      code: string;
      newPassword: string;
      purpose: 'invite' | 'forgot';
      advisorCode?: string;
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

    // Resolve user id
    let userId = otpRow.user_id;
    if (!userId) {
      const { data: userRow, error: userError } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('email', email.toLowerCase().trim())
        .maybeSingle();
      if (userError || !userRow) {
        return res.status(404).json({ error: 'User not found' });
      }
      userId = userRow.id;
    }

    // Update password via admin API
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      password: newPassword,
    });
    if (updateError) {
      console.error('Error updating password:', updateError);
      return res.status(500).json({ error: 'Failed to update password' });
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

