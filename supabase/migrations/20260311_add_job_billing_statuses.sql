-- Add billing status tracking for completed job cards.
-- Stores per-job status flags for invoicing, statements, and annuity processing.

ALTER TABLE public.job_cards
ADD COLUMN IF NOT EXISTS billing_statuses jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.job_cards.billing_statuses IS
'JSONB map of billing status flags (invoice, statement, annuity) with optional metadata.';