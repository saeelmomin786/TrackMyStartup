import type { VercelRequest, VercelResponse } from '@vercel/node';
import nodemailer from 'nodemailer';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    return res.status(200).json({ ok: true, message: 'Invite endpoint ready. Use POST to send email.' });
  }
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { kind, name, email, phone, startupName, appUrl } = (req.body || {}) as {
      kind: 'center' | 'investor';
      name: string;
      email: string;
      phone?: string;
      startupName?: string;
      appUrl?: string;
    };

    if (!['center', 'investor'].includes(String(kind)) || !name || !email) {
      return res.status(400).json({ error: 'Invalid payload' });
    }

    const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, FROM_EMAIL } = process.env as Record<string, string | undefined>;
    if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS) {
      console.error('api/send-invite missing SMTP env', { SMTP_HOST: !!SMTP_HOST, SMTP_PORT: !!SMTP_PORT, SMTP_USER: !!SMTP_USER, SMTP_PASS: !!SMTP_PASS });
      return res.status(500).json({ success: false, error: 'Email not configured' });
    }

    const portNum = Number(SMTP_PORT || '465');
    const is465 = String(portNum) === '465';
    const transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: portNum,
      secure: is465, // true for 465, false for 587
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
      console.error('api/send-invite transporter.verify failed:', verifyErr?.message || verifyErr);
      // continue; some providers reject verify() but still allow send
    }

    const roleLine = kind === 'center' ? 'Incubation Center / Accelerator' : 'Investor';
    const subject = kind === 'center'
      ? `Association details requested for ${startupName || 'a startup'}`
      : `Investment association details requested for ${startupName || 'a startup'}`;

    const registerUrl = appUrl ? `${appUrl}?page=register` : '';
    const text = [
      `Hello ${name},`,
      '',
      kind === 'center'
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
      console.error('api/send-invite sendMail failed:', sendErr?.code || sendErr?.message || sendErr);
      return res.status(500).json({ success: false, error: sendErr?.code || sendErr?.message || 'Email send failed' });
    }

    return res.status(200).json({ success: true });
  } catch (e: any) {
    console.error('api/send-invite error:', e);
    return res.status(500).json({ success: false, error: e?.message || 'Send failed' });
  }
}


