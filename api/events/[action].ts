import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import nodemailer from 'nodemailer';

type RegistrationAnswerInput = {
  questionId: string;
  answerText?: string;
  answerJson?: unknown;
};

type RegisterInitBody = {
  eventSlug?: string;
  fullName?: string;
  email?: string;
  phone?: string;
  companyName?: string;
  designation?: string;
  answers?: RegistrationAnswerInput[];
};

type CreateOrderBody = {
  registrationId?: string;
};

type VerifyPaymentBody = {
  registrationId?: string;
  razorpay_order_id?: string;
  razorpay_payment_id?: string;
  razorpay_signature?: string;
};

function json(res: VercelResponse, status: number, data: unknown): void {
  res.status(status).json(data);
}

function getAction(req: VercelRequest): string {
  const raw = req.query.action;
  return Array.isArray(raw) ? raw[0] : (raw || '');
}

function getSupabaseAdmin() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) return null;

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
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

function getHeaderValue(value: string | string[] | undefined): string {
  if (!value) return '';
  return Array.isArray(value) ? value[0] : value;
}

async function handleRegisterInit(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== 'POST') {
    return json(res, 405, { error: 'Method not allowed' });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return json(res, 500, { error: 'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY' });
  }

  try {
    const body = (req.body || {}) as RegisterInitBody;
    const eventSlug = body.eventSlug?.trim();
    const fullName = body.fullName?.trim();
    const email = body.email ? normalizeEmail(body.email) : '';
    const answers = Array.isArray(body.answers) ? body.answers : [];

    if (!eventSlug || !fullName || !email) {
      return json(res, 400, { error: 'eventSlug, fullName and email are required' });
    }

    if (!isValidEmail(email)) {
      return json(res, 400, { error: 'Invalid email format' });
    }

    const { data: eventRow, error: eventError } = await supabase
      .from('events')
      .select('id, title, slug, is_paid, amount, currency, is_published, is_active, start_at, registration_deadline, max_seats, seats_taken')
      .eq('slug', eventSlug)
      .maybeSingle();

    if (eventError) {
      return json(res, 500, { error: 'Failed to fetch event', details: eventError.message });
    }

    if (!eventRow || !eventRow.is_published || !eventRow.is_active) {
      return json(res, 404, { error: 'Event not found or not published' });
    }

    const now = new Date();
    if (eventRow.registration_deadline && new Date(eventRow.registration_deadline) < now) {
      return json(res, 400, { error: 'Registration deadline has passed' });
    }

    if (
      typeof eventRow.max_seats === 'number' &&
      typeof eventRow.seats_taken === 'number' &&
      eventRow.seats_taken >= eventRow.max_seats
    ) {
      return json(res, 400, { error: 'Event is fully booked' });
    }

    const amountDue = eventRow.is_paid ? Number(eventRow.amount || 0) : 0;
    const paymentStatus = eventRow.is_paid ? 'pending' : 'not_required';
    const status = eventRow.is_paid ? 'pending' : 'confirmed';

    const { data: registration, error: regError } = await supabase
      .from('event_registrations')
      .insert({
        event_id: eventRow.id,
        full_name: fullName,
        email,
        phone: body.phone?.trim() || null,
        company_name: body.companyName?.trim() || null,
        designation: body.designation?.trim() || null,
        status,
        payment_status: paymentStatus,
        amount_due: amountDue,
        currency: eventRow.currency || 'INR',
        metadata: {
          source: 'public_registration',
          created_via: 'api/events/register-init',
        },
      })
      .select('id, event_id, status, payment_status, amount_due, currency')
      .single();

    if (regError) {
      if (regError.code === '23505') {
        return json(res, 409, {
          error: 'This email is already registered for the event',
          details: regError.message,
        });
      }
      return json(res, 500, { error: 'Failed to create registration', details: regError.message });
    }

    if (answers.length > 0) {
      const answerRows = answers
        .filter((a) => a?.questionId && (a.answerText || a.answerJson !== undefined))
        .map((a) => ({
          registration_id: registration.id,
          question_id: a.questionId,
          answer_text: a.answerText ?? null,
          answer_json: a.answerJson ?? null,
        }));

      if (answerRows.length > 0) {
        const { error: answersError } = await supabase.from('event_registration_answers').insert(answerRows);
        if (answersError) {
          await supabase.from('event_registrations').delete().eq('id', registration.id);
          return json(res, 400, {
            error: 'Failed to save answers. Ensure question IDs belong to this event.',
            details: answersError.message,
          });
        }
      }
    }

    return json(res, 200, {
      success: true,
      registrationId: registration.id,
      eventId: registration.event_id,
      paymentRequired: eventRow.is_paid,
      amountDue: registration.amount_due,
      currency: registration.currency,
      status: registration.status,
      paymentStatus: registration.payment_status,
      message: eventRow.is_paid
        ? 'Registration created. Proceed to payment.'
        : 'Registration completed successfully.',
    });
  } catch (error) {
    return json(res, 500, {
      error: 'Server error',
      details: error instanceof Error ? error.message : String(error),
    });
  }
}

async function handleCreateOrder(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== 'POST') {
    return json(res, 405, { error: 'Method not allowed' });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return json(res, 500, { error: 'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY' });
  }

  const keyId = process.env.VITE_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.VITE_RAZORPAY_KEY_SECRET || process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) {
    return json(res, 500, { error: 'Razorpay keys not configured' });
  }

  try {
    const body = (req.body || {}) as CreateOrderBody;
    const registrationId = body.registrationId?.trim();

    if (!registrationId) {
      return json(res, 400, { error: 'registrationId is required' });
    }

    const { data: registration, error: regError } = await supabase
      .from('event_registrations')
      .select('id, event_id, payment_status, amount_due, currency')
      .eq('id', registrationId)
      .single();

    if (regError || !registration) {
      return json(res, 404, { error: 'Registration not found', details: regError?.message });
    }

    if (registration.payment_status === 'paid') {
      return json(res, 409, { error: 'Payment already completed for this registration' });
    }

    const amount = Number(registration.amount_due || 0);
    if (amount <= 0) {
      return json(res, 400, { error: 'This registration does not require payment' });
    }

    const amountInMinor = Math.round(amount * 100);
    if (amountInMinor < 100) {
      return json(res, 400, { error: 'Amount must be at least 1 unit of currency' });
    }

    const authHeader = `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString('base64')}`;
    const receiptRaw = `evtreg_${registration.id.replace(/-/g, '').slice(0, 24)}`;
    const receipt = receiptRaw.length > 40 ? receiptRaw.slice(0, 40) : receiptRaw;

    const rpResp = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authHeader,
      },
      body: JSON.stringify({
        amount: amountInMinor,
        currency: registration.currency || 'INR',
        receipt,
        payment_capture: 1,
      }),
    });

    if (!rpResp.ok) {
      const text = await rpResp.text();
      return json(res, rpResp.status, { error: 'Failed to create Razorpay order', details: text });
    }

    const order = await rpResp.json();

    const { error: paymentRowError } = await supabase.from('event_payments').insert({
      registration_id: registration.id,
      event_id: registration.event_id,
      payment_gateway: 'razorpay',
      order_id: order.id,
      status: 'created',
      amount,
      currency: registration.currency || 'INR',
      gateway_response: order,
      idempotency_key: `order:${order.id}`,
    });

    if (paymentRowError && paymentRowError.code !== '23505') {
      return json(res, 500, { error: 'Order created but failed to store payment row', details: paymentRowError.message });
    }

    return json(res, 200, {
      success: true,
      order,
      keyId,
      registrationId: registration.id,
      amount,
      currency: registration.currency || 'INR',
    });
  } catch (error) {
    return json(res, 500, {
      error: 'Server error',
      details: error instanceof Error ? error.message : String(error),
    });
  }
}

async function handleVerifyPayment(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== 'POST') {
    return json(res, 405, { error: 'Method not allowed' });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return json(res, 500, { error: 'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY' });
  }

  const keySecret = process.env.VITE_RAZORPAY_KEY_SECRET || process.env.RAZORPAY_KEY_SECRET;
  if (!keySecret) {
    return json(res, 500, { error: 'Missing Razorpay secret key' });
  }

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

    const { data: refreshedReg } = await supabase
      .from('event_registrations')
      .select('receipt_number')
      .eq('id', registration.id)
      .single();

    let emailSent = false;
    let providerMessageId: string | null = null;
    let emailError: string | null = null;
    let emailAlreadySent = false;

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
        await supabase
          .from('event_registrations')
          .update({ confirmation_email_sent_at: null })
          .eq('id', registration.id);
      }
    }

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

async function handleWebhook(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== 'POST') {
    return json(res, 405, { error: 'Method not allowed' });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return json(res, 500, { error: 'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY' });
  }

  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
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

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  const action = getAction(req);

  if (action === 'register-init') {
    return handleRegisterInit(req, res);
  }
  if (action === 'create-order') {
    return handleCreateOrder(req, res);
  }
  if (action === 'verify-payment') {
    return handleVerifyPayment(req, res);
  }
  if (action === 'webhook') {
    return handleWebhook(req, res);
  }

  return json(res, 404, { error: 'Unknown events API route' });
}
