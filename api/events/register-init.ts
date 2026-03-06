import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

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

function json(res: VercelResponse, status: number, data: unknown): void {
  res.status(status).json(data);
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== 'POST') {
    return json(res, 405, { error: 'Method not allowed' });
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return json(res, 500, { error: 'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY' });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

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
