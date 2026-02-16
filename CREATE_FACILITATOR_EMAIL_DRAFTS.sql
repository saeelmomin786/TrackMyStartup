-- Email drafts for facilitation centers (stored per auth user)

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = 'facilitator_email_drafts'
    ) THEN
        CREATE TABLE public.facilitator_email_drafts (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            facilitator_id UUID NOT NULL,
            name TEXT NOT NULL,
            subject TEXT,
            body TEXT,
            cc TEXT,
            bcc TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
    END IF;
END $$;

ALTER TABLE public.facilitator_email_drafts ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'facilitator_email_drafts'
          AND policyname = 'select_own_email_drafts'
    ) THEN
        CREATE POLICY select_own_email_drafts
        ON public.facilitator_email_drafts
        FOR SELECT
        USING (auth.uid() = facilitator_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'facilitator_email_drafts'
          AND policyname = 'insert_own_email_drafts'
    ) THEN
        CREATE POLICY insert_own_email_drafts
        ON public.facilitator_email_drafts
        FOR INSERT
        WITH CHECK (auth.uid() = facilitator_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'facilitator_email_drafts'
          AND policyname = 'update_own_email_drafts'
    ) THEN
        CREATE POLICY update_own_email_drafts
        ON public.facilitator_email_drafts
        FOR UPDATE
        USING (auth.uid() = facilitator_id)
        WITH CHECK (auth.uid() = facilitator_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'facilitator_email_drafts'
          AND policyname = 'delete_own_email_drafts'
    ) THEN
        CREATE POLICY delete_own_email_drafts
        ON public.facilitator_email_drafts
        FOR DELETE
        USING (auth.uid() = facilitator_id);
    END IF;
END $$;
