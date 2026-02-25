-- Add missing job sub type field used by client quote decommission routing logic.

ALTER TABLE public.client_quotes
ADD COLUMN IF NOT EXISTS job_sub_type text NULL;

COMMENT ON COLUMN public.client_quotes.job_sub_type IS
'Sub-category for client quotes (for example: decommission, de-install, new_install).';
