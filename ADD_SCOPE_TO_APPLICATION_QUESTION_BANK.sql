-- =====================================================
-- ADD SCOPE TO APPLICATION QUESTION BANK
-- =====================================================
-- Adds program-only questions support (per-form/per-opportunity)

ALTER TABLE public.application_question_bank
ADD COLUMN IF NOT EXISTS scope TEXT DEFAULT 'global',
ADD COLUMN IF NOT EXISTS scope_opportunity_id UUID;

COMMENT ON COLUMN public.application_question_bank.scope
IS 'Question scope: global (shared), facilitator (private), opportunity (only for a specific program/form)';

COMMENT ON COLUMN public.application_question_bank.scope_opportunity_id
IS 'If scope=opportunity, the program/opportunity ID this question is limited to';

CREATE INDEX IF NOT EXISTS idx_question_bank_scope
  ON public.application_question_bank(scope);

CREATE INDEX IF NOT EXISTS idx_question_bank_scope_opportunity
  ON public.application_question_bank(scope_opportunity_id);

-- =====================================================
-- Verification
-- =====================================================
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'application_question_bank'
  AND column_name IN ('scope', 'scope_opportunity_id');

-- =====================================================
-- ROLLBACK (if needed)
-- =====================================================
-- ALTER TABLE public.application_question_bank
-- DROP COLUMN IF EXISTS scope,
-- DROP COLUMN IF EXISTS scope_opportunity_id;
