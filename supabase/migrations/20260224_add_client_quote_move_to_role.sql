-- Store the intended role handoff on client quotes.
-- Used to route job cards on approval for decommission flows.

ALTER TABLE public.client_quotes
ADD COLUMN IF NOT EXISTS move_to_role text NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'client_quotes_move_to_role_check'
  ) THEN
    ALTER TABLE public.client_quotes
    ADD CONSTRAINT client_quotes_move_to_role_check
    CHECK (move_to_role IS NULL OR move_to_role IN ('inv', 'admin', 'accounts', 'none'));
  END IF;
END $$;

COMMENT ON COLUMN public.client_quotes.move_to_role IS
'Target role selected during quote creation for downstream job-card routing on approval.';
