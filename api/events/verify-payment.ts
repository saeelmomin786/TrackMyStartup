import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import nodemailer from 'nodemailer';

type VerifyPaymentBody = {
  registrationId?: string;
  razorpay_order_id?: string;
  razorpay_payment_id?: string;
  razorpay_signature?: string;
};

function json(res: VercelResponse, status: number, data: unknown): void {
  res.status(status).json(data);
}

function getMailerConfig() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const fromAddress = process.env.SMTP_FROM || process.env.SMTP_USER;
  const fromName = process.env.SMTP_FROM_NAME || 'TrackMyStartup';

  if (!host || !user || !pass || !fromAddress) {
    return null;
  }

  return { host, port, user, pass, fromAddress, fromName };
}

async function sendEventConfirmationEmail(input: {
  to: string;
  participantName: string;
  eventTitle: string;
  eventStartAt: string;
  eventTimezone: string;
  meetLink?: string | null;
  amountPaid: number;
  currency: string;
  receiptNumber?: string | null;
  paymentId: string;
}) {
  const cfg = getMailerConfig();
  if (!cfg) {
    return { sent: false, error: 'SMTP is not configured' as const, messageId: null as string | null };
  }

  const transporter = nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.port === 465,
    auth: {
      user: cfg.user,
      pass: cfg.pass,
    },
  });

  const formattedDate = new Date(input.eventStartAt).toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  const subject = `Registration Confirmed: ${input.eventTitle}`;
  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #0f172a;">
      <h2 style="margin-bottom: 8px;">Your event registration is confirmed</h2>
      <p>Hello ${input.participantName || 'Participant'},</p>
      <p>Thank you for registering. Your payment has been received successfully.</p>

      <h3 style="margin-top: 18px; margin-bottom: 8px;">Event details</h3>
      <ul>
        <li><strong>Event:</strong> ${input.eventTitle}</li>
        <li><strong>Date & time:</strong> ${formattedDate}</li>
        <li><strong>Timezone:</strong> ${input.eventTimezone || 'UTC'}</li>
        ${input.meetLink ? `<li><strong>Google Meet:</strong> <a href="${input.meetLink}">${input.meetLink}</a></li>` : ''}
      </ul>

      <h3 style="margin-top: 18px; margin-bottom: 8px;">Payment receipt</h3>
      <ul>
        <li><strong>Amount:</strong> ${input.currency} ${input.amountPaid.toFixed(2)}</li>
        <li><strong>Payment ID:</strong> ${input.paymentId}</li>
        <li><strong>Receipt No:</strong> ${input.receiptNumber || 'Will be generated shortly'}</li>
      </ul>

      <p style="margin-top: 18px;">If you need any help, reply to this email.</p>
      <p>TrackMyStartup Team</p>
    </div>
  `;

  const mailResult = await transporter.sendMail({
    from: `${cfg.fromName} <${cfg.fromAddress}>`,
    to: input.to,
    subject,
    html,
  });

  return { sent: true, messageId: mailResult.messageId, error: null as string | null };
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== 'POST') {
    return json(res, 405, { error: 'Method not allowed' });
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
  const keySecret = process.env.VITE_RAZORPAY_KEY_SECRET || process.env.RAZORPAY_KEY_SECRET;

  if (!supabaseUrl || !serviceRoleKey) {
    return json(res, 500, { error: 'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY' });
  }

  if (!keySecret) {
    return json(res, 500, { error: 'Missing Razorpay secret key' });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    const body = (req.body || {}) as VerifyPaymentBody;
    const registrationId = body.registrationId?.trim();
    const orderId = body.razorpay_order_id?.trim();
    const paymentId = body.razorpay_payment_id?.trim();
    const signature = body.razorpay_signature?.trim();

    if (!registrationId || !orderId || !paymentId || !signature) {
      return json(res, 400, {
        error: 'registrationId, razorpay_order_id, razorpay_payment_id, razorpay_signature are required',
      });
    }

    const payload = `${orderId}|${paymentId}`;
    const expectedSignature = crypto
      .createHmac('sha256', keySecret)
      .update(payload)
      .digest('hex');

    if (expectedSignature !== signature) {
      return json(res, 400, { error: 'Invalid payment signature' });
    }

    const { data: registration, error: regError } = await supabase
      .from('event_registrations')
      .select('id, event_id, amount_due, currency, email, full_name, receipt_number')
      .eq('id', registrationId)
      .single();

    if (regError || !registration) {
      return json(res, 404, { error: 'Registration not found', details: regError?.message });
    }

    const amount = Number(registration.amount_due || 0);
    if (amount <= 0) {
      return json(res, 400, { error: 'Registration does not have payable amount' });
    }

    const { data: rpcPaymentId, error: rpcError } = await supabase.rpc('confirm_event_payment', {
      p_registration_id: registration.id,
      p_gateway: 'razorpay',
      p_order_id: orderId,
      p_payment_id: paymentId,
      p_signature: signature,
      p_amount: amount,
      p_currency: registration.currency || 'INR',
      p_webhook_payload: {
        source: 'client_verify_endpoint',
        verified_at: new Date().toISOString(),
      },
    });

    if (rpcError) {
      return json(res, 500, { error: 'Failed to confirm payment', details: rpcError.message });
    }

    const { data: eventData } = await supabase
      .from('events')
      .select('title, start_at, timezone, meet_link, is_paid')
      .eq('id', registration.event_id)
      .single();

    if (!eventData?.is_paid) {
      return json(res, 400, { error: 'Meet link email is only applicable for paid events' });
    }

    // Refresh receipt number (it may be set during confirm_event_payment).
    const { data: refreshedReg } = await supabase
      .from('event_registrations')
      .select('receipt_number')
      .eq('id', registration.id)
      .single();

    let emailSent = false;
    let providerMessageId: string | null = null;
    let emailError: string | null = null;
    let emailAlreadySent = false;

    // Ensure confirmation email is sent only once even if webhook + verify both run.
    const { data: emailLockRow, error: emailLockError } = await supabase
      .from('event_registrations')
      .update({ confirmation_email_sent_at: new Date().toISOString() })
      .eq('id', registration.id)
      .is('confirmation_email_sent_at', null)
      .select('id')
      .maybeSingle();

    if (emailLockError) {
      return json(res, 500, {
        error: 'Payment confirmed but failed to lock email send state',
        details: emailLockError.message,
      });
    }

    if (!emailLockRow) {
      emailAlreadySent = true;
    }

    if (!emailAlreadySent) {
      try {
        const mail = await sendEventConfirmationEmail({
          to: registration.email,
          participantName: registration.full_name || 'Participant',
          eventTitle: eventData?.title || 'TrackMyStartup Event',
          eventStartAt: eventData?.start_at || new Date().toISOString(),
          eventTimezone: eventData?.timezone || 'UTC',
          meetLink: eventData?.is_paid ? eventData?.meet_link || null : null,
          amountPaid: amount,
          currency: registration.currency || 'INR',
          receiptNumber: refreshedReg?.receipt_number || registration.receipt_number || null,
          paymentId,
        });

        emailSent = mail.sent;
        providerMessageId = mail.messageId;
        emailError = mail.error;
      } catch (e: any) {
        emailError = e?.message || 'Failed to send confirmation email';
      }

      if (!emailSent) {
        // Release lock to allow retry from webhook/manual retry path.
        await supabase
          .from('event_registrations')
          .update({ confirmation_email_sent_at: null })
          .eq('id', registration.id);
      }
    }

    // Log only when this request attempted sending the email.
    const { error: emailLogError } = emailAlreadySent
      ? { error: null as any }
      : await supabase.from('event_email_logs').insert([
          {
            event_id: registration.event_id,
            registration_id: registration.id,
            email_type: 'registration_confirmation',
            recipient_email: registration.email,
            provider: 'smtp',
            provider_message_id: providerMessageId,
            status: emailSent ? 'sent' : 'failed',
            subject: 'Event Registration Confirmed',
            error_message: emailError,
            sent_at: emailSent ? new Date().toISOString() : null,
          },
          {
            event_id: registration.event_id,
            registration_id: registration.id,
            email_type: 'payment_receipt',
            recipient_email: registration.email,
            provider: 'smtp',
            provider_message_id: providerMessageId,
            status: emailSent ? 'sent' : 'failed',
            subject: 'Payment Receipt',
            error_message: emailError,
            sent_at: emailSent ? new Date().toISOString() : null,
          },
        ]);

    if (emailLogError) {
      return json(res, 200, {
        success: true,
        paymentConfirmed: true,
        paymentRecordId: rpcPaymentId,
        warning: 'Payment confirmed but email queue insert failed',
        warningDetails: emailLogError.message,
      });
    }

    return json(res, 200, {
      success: true,
      paymentConfirmed: true,
      paymentRecordId: rpcPaymentId,
      emailAlreadySent,
      emailSent,
      emailError,
      message: emailSent
        ? 'Payment verified, registration confirmed, and email sent.'
        : emailAlreadySent
        ? 'Payment verified and registration confirmed. Confirmation email was already sent.'
        : 'Payment verified and registration confirmed. Email sending failed.',
    });
  } catch (error) {
    return json(res, 500, {
      error: 'Server error',
      details: error instanceof Error ? error.message : String(error),
    });
  }
}
