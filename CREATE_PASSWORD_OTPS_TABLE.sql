-- OTP storage for invites and forgot-password
-- Run in Supabase SQL editor
CREATE TABLE IF NOT EXISTS public.password_otps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  user_id UUID,
  code TEXT NOT NULL,
  purpose TEXT NOT NULL CHECK (purpose IN ('invite', 'forgot')),
  advisor_code TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  attempts INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_password_otps_email ON public.password_otps(email);
CREATE INDEX IF NOT EXISTS idx_password_otps_code ON public.password_otps(code);

