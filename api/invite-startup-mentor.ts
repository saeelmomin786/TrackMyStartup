import type { VercelRequest, VercelResponse } from '@vercel/node';
import nodemailer from 'nodemailer';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
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

    // Send simple invitation email
    try {
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
    } catch (emailErr: any) {
      console.error('Error sending invitation email:', emailErr);
      return res.status(500).json({ error: 'Failed to send invitation email' });
    }
  } catch (error: any) {
    console.error('Error in invite-startup-mentor:', error);
    console.error('Error stack:', error.stack);
    return res.status(500).json({ 
      error: error.message || 'Internal server error',
      details: error.details || error.hint || 'No additional details available'
    });
  }
}

