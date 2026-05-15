-- Partner / service provider network for incubation centers (facilitator = auth user id)
-- Run in Supabase SQL editor or psql.

CREATE TABLE IF NOT EXISTS public.facilitator_network_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facilitator_id UUID NOT NULL,
  network_kind TEXT NOT NULL CHECK (network_kind IN ('service_provider', 'partner')),
  name TEXT NOT NULL DEFAULT '',
  contact_number TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  service_type TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_facilitator_network_contacts_facilitator
  ON public.facilitator_network_contacts (facilitator_id, network_kind);

CREATE TABLE IF NOT EXISTS public.facilitator_network_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facilitator_id UUID NOT NULL,
  startup_id INTEGER NOT NULL REFERENCES public.startups (id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES public.facilitator_network_contacts (id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT facilitator_network_assignments_unique UNIQUE (facilitator_id, startup_id, contact_id)
);

CREATE INDEX IF NOT EXISTS idx_facilitator_network_assignments_startup
  ON public.facilitator_network_assignments (startup_id);

CREATE INDEX IF NOT EXISTS idx_facilitator_network_assignments_facilitator
  ON public.facilitator_network_assignments (facilitator_id);

-- Keep updated_at in sync (optional)
CREATE OR REPLACE FUNCTION public.set_facilitator_network_contacts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_facilitator_network_contacts_updated ON public.facilitator_network_contacts;
CREATE TRIGGER trg_facilitator_network_contacts_updated
  BEFORE UPDATE ON public.facilitator_network_contacts
  FOR EACH ROW EXECUTE FUNCTION public.set_facilitator_network_contacts_updated_at();

ALTER TABLE public.facilitator_network_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.facilitator_network_assignments ENABLE ROW LEVEL SECURITY;

-- Facilitators manage their own contacts
DROP POLICY IF EXISTS "facilitator_network_contacts_facilitator_all" ON public.facilitator_network_contacts;
CREATE POLICY "facilitator_network_contacts_facilitator_all"
  ON public.facilitator_network_contacts
  FOR ALL
  TO authenticated
  USING (facilitator_id = auth.uid())
  WITH CHECK (facilitator_id = auth.uid());

-- Startups can read contact rows linked to them via an assignment (owner = startups.user_id)
DROP POLICY IF EXISTS "facilitator_network_contacts_startup_select" ON public.facilitator_network_contacts;
CREATE POLICY "facilitator_network_contacts_startup_select"
  ON public.facilitator_network_contacts
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.facilitator_network_assignments a
      INNER JOIN public.startups s ON s.id = a.startup_id
      WHERE a.contact_id = facilitator_network_contacts.id
        AND s.user_id = auth.uid()
    )
  );

-- Facilitators manage their assignments
DROP POLICY IF EXISTS "facilitator_network_assignments_facilitator_all" ON public.facilitator_network_assignments;
CREATE POLICY "facilitator_network_assignments_facilitator_all"
  ON public.facilitator_network_assignments
  FOR ALL
  TO authenticated
  USING (facilitator_id = auth.uid())
  WITH CHECK (facilitator_id = auth.uid());

-- Startups read assignments for startups they own (same pattern as mentor_startup_assignments)
DROP POLICY IF EXISTS "facilitator_network_assignments_startup_select" ON public.facilitator_network_assignments;
CREATE POLICY "facilitator_network_assignments_startup_select"
  ON public.facilitator_network_assignments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.startups s
      WHERE s.id = facilitator_network_assignments.startup_id
        AND s.user_id = auth.uid()
    )
  );

COMMENT ON TABLE public.facilitator_network_contacts IS 'Service providers and partners managed by an incubation center (facilitator_id = auth.uid()).';
COMMENT ON TABLE public.facilitator_network_assignments IS 'Links network contacts to portfolio startups for a facilitator.';

GRANT ALL ON TABLE public.facilitator_network_contacts TO authenticated;
GRANT ALL ON TABLE public.facilitator_network_assignments TO authenticated;
