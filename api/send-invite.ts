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

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 465),
      secure: (process.env.SMTP_PORT || '465') === '465',
      auth: { user: process.env.SMTP_USER as string, pass: process.env.SMTP_PASS as string }
    });

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

    await transporter.sendMail({
      from: process.env.FROM_EMAIL || `TrackMyStartup Support <${process.env.SMTP_USER}>`,
      to: email,
      subject,
      text
    });

    return res.status(200).json({ success: true });
  } catch (e: any) {
    console.error('api/send-invite error:', e);
    return res.status(500).json({ success: false, error: e?.message || 'Send failed' });
  }
}


