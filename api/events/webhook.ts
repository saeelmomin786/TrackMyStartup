import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import nodemailer from 'nodemailer';

function json(res: VercelResponse, status: number, data: unknown): void {
  res.status(status).json(data);
}

function getHeaderValue(value: string | string[] | undefined): string {
  if (!value) return '';
  return Array.isArray(value) ? value[0] : value;
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
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

  if (!supabaseUrl || !serviceRoleKey) {
    return json(res, 500, { error: 'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY' });
  }

  if (!webhookSecret) {
    return json(res, 500, { error: 'Missing RAZORPAY_WEBHOOK_SECRET' });
  }

  const signature = getHeaderValue(req.headers['x-razorpay-signature']);
  if (!signature) {
    return json(res, 400, { error: 'Missing x-razorpay-signature header' });
  }

  const body = req.body || {};
  const bodyString = JSON.stringify(body);
  const expectedSignature = crypto
    .createHmac('sha256', webhookSecret)
    .update(bodyString)
    .digest('hex');

  if (expectedSignature !== signature) {
    return json(res, 401, { error: 'Invalid webhook signature' });
  }

  const eventType = body?.event;
  const paymentEntity = body?.payload?.payment?.entity;

  if (!paymentEntity) {
    return json(res, 400, { error: 'Missing payment entity in webhook payload' });
  }

  // Process only final or near-final payment events.
  if (!['payment.captured', 'payment.authorized'].includes(eventType)) {
    return json(res, 200, { success: true, ignored: true, eventType });
  }

  const orderId = paymentEntity.order_id as string | undefined;
  const paymentId = paymentEntity.id as string | undefined;
  const currency = (paymentEntity.currency as string | undefined) || 'INR';
  const amountMajor = Number(paymentEntity.amount || 0) / 100;

  if (!orderId || !paymentId || amountMajor <= 0) {
    return json(res, 400, {
      error: 'Webhook payload missing order_id/payment_id/amount',
      eventType,
    });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    const { data: paymentRow, error: paymentRowError } = await supabase
      .from('event_payments')
      .select('id, registration_id')
      .eq('order_id', orderId)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (paymentRowError) {
      return json(res, 500, { error: 'Failed to map order to registration', details: paymentRowError.message });
    }

    if (!paymentRow?.registration_id) {
      return json(res, 404, { error: 'No registration found for this order id' });
    }

    // Update the created order row for audit visibility.
    await supabase
      .from('event_payments')
      .update({
        payment_id: paymentId,
        status: eventType === 'payment.captured' ? 'captured' : 'authorized',
        currency,
        amount: amountMajor,
        signature,
        webhook_payload: body,
        verified_at: new Date().toISOString(),
      })
      .eq('id', paymentRow.id);

    const { error: confirmError } = await supabase.rpc('confirm_event_payment', {
      p_registration_id: paymentRow.registration_id,
      p_gateway: 'razorpay',
      p_order_id: orderId,
      p_payment_id: paymentId,
      p_signature: signature,
      p_amount: amountMajor,
      p_currency: currency,
      p_webhook_payload: body,
    });

    if (confirmError) {
      return json(res, 500, { error: 'Failed to confirm payment from webhook', details: confirmError.message });
    }

    const { data: registration } = await supabase
      .from('event_registrations')
      .select('id, event_id, email, full_name, amount_due, currency, receipt_number')
      .eq('id', paymentRow.registration_id)
      .single();

    if (!registration) {
      return json(res, 200, {
        success: true,
        warning: 'Payment confirmed but registration not found for email delivery',
        eventType,
        orderId,
        paymentId,
        registrationId: paymentRow.registration_id,
      });
    }

    const { data: eventData } = await supabase
      .from('events')
      .select('title, start_at, timezone, meet_link, is_paid')
      .eq('id', registration.event_id)
      .single();

    // Meet link should be shared only after successful paid registration completion.
    if (eventData?.is_paid) {
      const { data: emailLockRow } = await supabase
        .from('event_registrations')
        .update({ confirmation_email_sent_at: new Date().toISOString() })
        .eq('id', registration.id)
        .is('confirmation_email_sent_at', null)
        .select('id')
        .maybeSingle();

      if (emailLockRow) {
        let emailSent = false;
        let providerMessageId: string | null = null;
        let emailError: string | null = null;

        try {
          const mail = await sendEventConfirmationEmail({
            to: registration.email,
            participantName: registration.full_name || 'Participant',
            eventTitle: eventData?.title || 'TrackMyStartup Event',
            eventStartAt: eventData?.start_at || new Date().toISOString(),
            eventTimezone: eventData?.timezone || 'UTC',
            meetLink: eventData?.meet_link || null,
            amountPaid: Number(registration.amount_due || amountMajor),
            currency: registration.currency || currency,
            receiptNumber: registration.receipt_number || null,
            paymentId,
          });

          emailSent = mail.sent;
          providerMessageId = mail.messageId;
          emailError = mail.error;
        } catch (e: any) {
          emailError = e?.message || 'Failed to send confirmation email';
        }

        if (!emailSent) {
          await supabase
            .from('event_registrations')
            .update({ confirmation_email_sent_at: null })
            .eq('id', registration.id);
        }

        await supabase.from('event_email_logs').insert([
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
      }
    }

    return json(res, 200, {
      success: true,
      eventType,
      orderId,
      paymentId,
      registrationId: paymentRow.registration_id,
    });
  } catch (error) {
    return json(res, 500, {
      error: 'Server error',
      details: error instanceof Error ? error.message : String(error),
    });
  }
}
