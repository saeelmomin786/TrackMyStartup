-- =====================================================
-- PUBLIC EVENTS + REGISTRATION + PAYMENT VERIFICATION
-- =====================================================
-- Purpose:
-- 1) Admin creates events and dynamic registration forms
-- 2) Public users register without login
-- 3) Paid events are confirmed only after verified payment
-- 4) Confirmation/receipt emails can be tracked in DB
--
-- Run in Supabase SQL Editor
-- =====================================================

BEGIN;

-- -----------------------------------------------------
-- 0) Utility: updated_at trigger function (isolated)
-- -----------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_event_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Resilient admin checker for RLS policies.
-- Uses public.is_admin() if available, else falls back to public.get_user_role().
CREATE OR REPLACE FUNCTION public.event_is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_admin BOOLEAN;
  v_role TEXT;
BEGIN
  IF to_regprocedure('public.is_admin()') IS NOT NULL THEN
    EXECUTE 'SELECT public.is_admin()' INTO v_is_admin;
    RETURN COALESCE(v_is_admin, FALSE);
  END IF;

  IF to_regprocedure('public.get_user_role()') IS NOT NULL THEN
    EXECUTE 'SELECT public.get_user_role()' INTO v_role;
    RETURN COALESCE(v_role = 'Admin', FALSE);
  END IF;

  RETURN FALSE;
END;
$$;

-- -----------------------------------------------------
-- 1) Core events table
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  short_description TEXT,
  description TEXT,
  banner_image_url TEXT,
  whatsapp_group_link TEXT,
  timezone TEXT NOT NULL DEFAULT 'UTC',
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ,
  registration_deadline TIMESTAMPTZ,
  venue_type TEXT NOT NULL DEFAULT 'online' CHECK (venue_type IN ('online', 'offline', 'hybrid')),
  venue_details TEXT,
  meet_link TEXT,
  is_paid BOOLEAN NOT NULL DEFAULT FALSE,
  amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'INR',
  max_seats INTEGER,
  seats_taken INTEGER NOT NULL DEFAULT 0,
  allow_multiple_registrations_per_email BOOLEAN NOT NULL DEFAULT FALSE,
  is_published BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT events_amount_non_negative CHECK (amount >= 0),
  CONSTRAINT events_paid_amount_check CHECK (
    (is_paid = FALSE AND amount = 0)
    OR (is_paid = TRUE AND amount > 0)
  ),
  CONSTRAINT events_end_after_start CHECK (end_at IS NULL OR end_at >= start_at),
  CONSTRAINT events_reg_deadline_before_start CHECK (
    registration_deadline IS NULL OR registration_deadline <= start_at
  ),
  CONSTRAINT events_seats_check CHECK (
    max_seats IS NULL OR (max_seats > 0 AND seats_taken >= 0 AND seats_taken <= max_seats)
  )
);

CREATE INDEX IF NOT EXISTS idx_events_published_active_start
  ON public.events(is_published, is_active, start_at);
CREATE INDEX IF NOT EXISTS idx_events_slug
  ON public.events(slug);

DROP TRIGGER IF EXISTS trg_events_set_updated_at ON public.events;
CREATE TRIGGER trg_events_set_updated_at
BEFORE UPDATE ON public.events
FOR EACH ROW
EXECUTE FUNCTION public.set_event_updated_at();

-- -----------------------------------------------------
-- 2) Dynamic form schema for each event
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.event_form_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  question_type TEXT NOT NULL CHECK (
    question_type IN (
      'short_text',
      'long_text',
      'email',
      'phone',
      'number',
      'dropdown',
      'radio',
      'checkbox',
      'date',
      'file_upload'
    )
  ),
  is_required BOOLEAN NOT NULL DEFAULT FALSE,
  options_json JSONB,
  placeholder TEXT,
  help_text TEXT,
  min_length INTEGER,
  max_length INTEGER,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT event_form_questions_length_bounds CHECK (
    (min_length IS NULL OR min_length >= 0)
    AND (max_length IS NULL OR max_length >= 0)
    AND (min_length IS NULL OR max_length IS NULL OR min_length <= max_length)
  )
);

CREATE INDEX IF NOT EXISTS idx_event_form_questions_event_order
  ON public.event_form_questions(event_id, sort_order);
CREATE UNIQUE INDEX IF NOT EXISTS uq_event_form_questions_event_order
  ON public.event_form_questions(event_id, sort_order, id);

DROP TRIGGER IF EXISTS trg_event_form_questions_set_updated_at ON public.event_form_questions;
CREATE TRIGGER trg_event_form_questions_set_updated_at
BEFORE UPDATE ON public.event_form_questions
FOR EACH ROW
EXECUTE FUNCTION public.set_event_updated_at();

-- -----------------------------------------------------
-- 3) Public registrations
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.event_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  company_name TEXT,
  designation TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'confirmed', 'cancelled', 'waitlisted')
  ),
  payment_status TEXT NOT NULL DEFAULT 'not_required' CHECK (
    payment_status IN ('not_required', 'pending', 'paid', 'failed', 'refunded')
  ),
  amount_due NUMERIC(12,2) NOT NULL DEFAULT 0,
  amount_paid NUMERIC(12,2),
  currency TEXT NOT NULL DEFAULT 'INR',
  receipt_number TEXT,
  payment_confirmed_at TIMESTAMPTZ,
  confirmation_email_sent_at TIMESTAMPTZ,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT event_registrations_amount_due_non_negative CHECK (amount_due >= 0),
  CONSTRAINT event_registrations_amount_paid_non_negative CHECK (amount_paid IS NULL OR amount_paid >= 0)
);

CREATE INDEX IF NOT EXISTS idx_event_registrations_event_id
  ON public.event_registrations(event_id);
CREATE INDEX IF NOT EXISTS idx_event_registrations_email
  ON public.event_registrations(lower(email));
CREATE INDEX IF NOT EXISTS idx_event_registrations_payment_status
  ON public.event_registrations(payment_status);
CREATE INDEX IF NOT EXISTS idx_event_registrations_status
  ON public.event_registrations(status);

-- Enforce one registration per event per email by default.
-- If you need multi-registration mode, enforce in API by event flag.
CREATE UNIQUE INDEX IF NOT EXISTS uq_event_registration_event_email
  ON public.event_registrations(event_id, lower(email));

DROP TRIGGER IF EXISTS trg_event_registrations_set_updated_at ON public.event_registrations;
CREATE TRIGGER trg_event_registrations_set_updated_at
BEFORE UPDATE ON public.event_registrations
FOR EACH ROW
EXECUTE FUNCTION public.set_event_updated_at();

-- -----------------------------------------------------
-- 4) Answers to dynamic questions
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.event_registration_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_id UUID NOT NULL REFERENCES public.event_registrations(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.event_form_questions(id) ON DELETE CASCADE,
  answer_text TEXT,
  answer_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT event_answers_has_value CHECK (answer_text IS NOT NULL OR answer_json IS NOT NULL)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_event_answer_registration_question
  ON public.event_registration_answers(registration_id, question_id);
CREATE INDEX IF NOT EXISTS idx_event_answers_registration
  ON public.event_registration_answers(registration_id);

-- -----------------------------------------------------
-- 5) Payments ledger (idempotent + auditable)
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.event_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_id UUID NOT NULL REFERENCES public.event_registrations(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  payment_gateway TEXT NOT NULL CHECK (payment_gateway IN ('razorpay', 'paypal', 'stripe', 'manual')),
  idempotency_key TEXT,
  order_id TEXT,
  payment_id TEXT,
  signature TEXT,
  status TEXT NOT NULL DEFAULT 'created' CHECK (
    status IN ('created', 'authorized', 'captured', 'failed', 'refunded')
  ),
  amount NUMERIC(12,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'INR',
  gateway_response JSONB,
  webhook_payload JSONB,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT event_payments_amount_positive CHECK (amount > 0)
);

CREATE INDEX IF NOT EXISTS idx_event_payments_registration
  ON public.event_payments(registration_id);
CREATE INDEX IF NOT EXISTS idx_event_payments_event
  ON public.event_payments(event_id);
CREATE INDEX IF NOT EXISTS idx_event_payments_status
  ON public.event_payments(status);
CREATE INDEX IF NOT EXISTS idx_event_payments_order_id
  ON public.event_payments(order_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_event_payments_payment_id
  ON public.event_payments(payment_id)
  WHERE payment_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_event_payments_idempotency
  ON public.event_payments(idempotency_key)
  WHERE idempotency_key IS NOT NULL;

DROP TRIGGER IF EXISTS trg_event_payments_set_updated_at ON public.event_payments;
CREATE TRIGGER trg_event_payments_set_updated_at
BEFORE UPDATE ON public.event_payments
FOR EACH ROW
EXECUTE FUNCTION public.set_event_updated_at();

-- -----------------------------------------------------
-- 6) Email delivery logs (confirmation, receipt, reminders)
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.event_email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  registration_id UUID REFERENCES public.event_registrations(id) ON DELETE SET NULL,
  email_type TEXT NOT NULL CHECK (
    email_type IN ('registration_confirmation', 'payment_receipt', 'reminder', 'custom')
  ),
  recipient_email TEXT NOT NULL,
  provider TEXT,
  provider_message_id TEXT,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (
    status IN ('queued', 'sent', 'failed')
  ),
  subject TEXT,
  error_message TEXT,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_event_email_logs_event
  ON public.event_email_logs(event_id);
CREATE INDEX IF NOT EXISTS idx_event_email_logs_registration
  ON public.event_email_logs(registration_id);
CREATE INDEX IF NOT EXISTS idx_event_email_logs_status
  ON public.event_email_logs(status);

-- -----------------------------------------------------
-- 7) Helper function: generate receipt number
-- -----------------------------------------------------
CREATE OR REPLACE FUNCTION public.generate_event_receipt_number(p_event_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  v_day TEXT;
  v_rand TEXT;
BEGIN
  v_day := to_char(now(), 'YYYYMMDD');
  v_rand := upper(substr(replace(gen_random_uuid()::TEXT, '-', ''), 1, 8));
  RETURN 'EVT-' || v_day || '-' || v_rand;
END;
$$;

-- -----------------------------------------------------
-- 8) Helper function: confirm verified payment atomically
-- -----------------------------------------------------
-- Call from secure backend after signature/webhook verification.
CREATE OR REPLACE FUNCTION public.confirm_event_payment(
  p_registration_id UUID,
  p_gateway TEXT,
  p_order_id TEXT,
  p_payment_id TEXT,
  p_signature TEXT,
  p_amount NUMERIC,
  p_currency TEXT,
  p_webhook_payload JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payment_id UUID;
  v_existing_payment UUID;
  v_event_id UUID;
  v_receipt TEXT;
BEGIN
  -- Idempotency by gateway payment_id
  SELECT id INTO v_existing_payment
  FROM public.event_payments
  WHERE payment_id = p_payment_id
  LIMIT 1;

  IF v_existing_payment IS NOT NULL THEN
    RETURN v_existing_payment;
  END IF;

  -- Lock registration row to avoid race conditions
  SELECT er.event_id
    INTO v_event_id
  FROM public.event_registrations er
  WHERE er.id = p_registration_id
  FOR UPDATE;

  IF v_event_id IS NULL THEN
    RAISE EXCEPTION 'Registration not found';
  END IF;

  INSERT INTO public.event_payments (
    registration_id,
    event_id,
    payment_gateway,
    order_id,
    payment_id,
    signature,
    status,
    amount,
    currency,
    webhook_payload,
    verified_at
  ) VALUES (
    p_registration_id,
    v_event_id,
    p_gateway,
    p_order_id,
    p_payment_id,
    p_signature,
    'captured',
    p_amount,
    p_currency,
    p_webhook_payload,
    now()
  )
  RETURNING id INTO v_payment_id;

  v_receipt := public.generate_event_receipt_number(v_event_id);

  UPDATE public.event_registrations
  SET
    payment_status = 'paid',
    status = 'confirmed',
    amount_paid = p_amount,
    currency = p_currency,
    payment_confirmed_at = now(),
    receipt_number = COALESCE(receipt_number, v_receipt),
    updated_at = now()
  WHERE id = p_registration_id;

  RETURN v_payment_id;
END;
$$;

REVOKE ALL ON FUNCTION public.confirm_event_payment(UUID, TEXT, TEXT, TEXT, TEXT, NUMERIC, TEXT, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.confirm_event_payment(UUID, TEXT, TEXT, TEXT, TEXT, NUMERIC, TEXT, JSONB) TO service_role;

-- -----------------------------------------------------
-- 9) RLS
-- -----------------------------------------------------
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_form_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_registration_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_email_logs ENABLE ROW LEVEL SECURITY;

-- Public read-only access for published events
DROP POLICY IF EXISTS "Public can read published events" ON public.events;
CREATE POLICY "Public can read published events"
ON public.events
FOR SELECT
TO anon, authenticated
USING (is_published = TRUE AND is_active = TRUE);

DROP POLICY IF EXISTS "Admin can manage events" ON public.events;
CREATE POLICY "Admin can manage events"
ON public.events
FOR ALL
TO authenticated
USING (public.event_is_admin())
WITH CHECK (public.event_is_admin());

-- Public read-only access for active questions of published events
DROP POLICY IF EXISTS "Public can read published event questions" ON public.event_form_questions;
CREATE POLICY "Public can read published event questions"
ON public.event_form_questions
FOR SELECT
TO anon, authenticated
USING (
  is_active = TRUE
  AND EXISTS (
    SELECT 1
    FROM public.events e
    WHERE e.id = event_form_questions.event_id
      AND e.is_published = TRUE
      AND e.is_active = TRUE
  )
);

DROP POLICY IF EXISTS "Admin can manage event questions" ON public.event_form_questions;
CREATE POLICY "Admin can manage event questions"
ON public.event_form_questions
FOR ALL
TO authenticated
USING (public.event_is_admin())
WITH CHECK (public.event_is_admin());

-- Registration/payment/email records are admin-view by default.
-- Public inserts should happen through secure backend APIs using service role.
DROP POLICY IF EXISTS "Admin can read event registrations" ON public.event_registrations;
CREATE POLICY "Admin can read event registrations"
ON public.event_registrations
FOR SELECT
TO authenticated
USING (public.event_is_admin());

DROP POLICY IF EXISTS "Admin can update event registrations" ON public.event_registrations;
CREATE POLICY "Admin can update event registrations"
ON public.event_registrations
FOR UPDATE
TO authenticated
USING (public.event_is_admin())
WITH CHECK (public.event_is_admin());

DROP POLICY IF EXISTS "Admin can read event answers" ON public.event_registration_answers;
CREATE POLICY "Admin can read event answers"
ON public.event_registration_answers
FOR SELECT
TO authenticated
USING (
  public.event_is_admin()
  AND EXISTS (
    SELECT 1
    FROM public.event_registrations er
    WHERE er.id = event_registration_answers.registration_id
  )
);

DROP POLICY IF EXISTS "Admin can read event payments" ON public.event_payments;
CREATE POLICY "Admin can read event payments"
ON public.event_payments
FOR SELECT
TO authenticated
USING (public.event_is_admin());

DROP POLICY IF EXISTS "Admin can read email logs" ON public.event_email_logs;
CREATE POLICY "Admin can read email logs"
ON public.event_email_logs
FOR SELECT
TO authenticated
USING (public.event_is_admin());

-- -----------------------------------------------------
-- 10) Privileges (least privilege for anon/authenticated)
-- -----------------------------------------------------
REVOKE ALL ON public.event_registrations FROM anon, authenticated;
REVOKE ALL ON public.event_registration_answers FROM anon, authenticated;
REVOKE ALL ON public.event_payments FROM anon, authenticated;
REVOKE ALL ON public.event_email_logs FROM anon, authenticated;

GRANT SELECT ON public.events TO anon, authenticated;
GRANT SELECT ON public.event_form_questions TO anon, authenticated;

-- Admin UI queries these tables using authenticated users; RLS still restricts rows to admins.
GRANT SELECT ON public.event_registrations TO authenticated;
GRANT UPDATE ON public.event_registrations TO authenticated;
GRANT SELECT ON public.event_registration_answers TO authenticated;
GRANT SELECT ON public.event_payments TO authenticated;
GRANT SELECT ON public.event_email_logs TO authenticated;

-- service_role typically bypasses RLS, but explicit grants are still useful.
GRANT ALL ON public.events TO service_role;
GRANT ALL ON public.event_form_questions TO service_role;
GRANT ALL ON public.event_registrations TO service_role;
GRANT ALL ON public.event_registration_answers TO service_role;
GRANT ALL ON public.event_payments TO service_role;
GRANT ALL ON public.event_email_logs TO service_role;

COMMIT;

-- =====================================================
-- NEXT IMPLEMENTATION STEPS (APP CODE)
-- =====================================================
-- 1) Admin tab: create/edit/publish events + dynamic questions
-- 2) Public page: /events/:slug and /events/:slug/register
-- 3) APIs:
--    - POST /api/events/register/init
--    - POST /api/events/payment/create-order
--    - POST /api/events/payment/verify
--    - POST /api/events/payment/webhook
-- 4) Email sender after payment confirmation:
--    - confirmation + receipt + meet link
-- =====================================================
