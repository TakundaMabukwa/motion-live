-- Add a dedicated annuity end date field separate from decommission_date.
-- This supports client quote approval flows that need annuity tracking.

ALTER TABLE public.client_quotes
ADD COLUMN IF NOT EXISTS annuity_end_date date NULL;

ALTER TABLE public.job_cards
ADD COLUMN IF NOT EXISTS annuity_end_date date NULL;

COMMENT ON COLUMN public.client_quotes.annuity_end_date IS
'Dedicated annuity end date captured during quote approval; separate from decommission_date.';

COMMENT ON COLUMN public.job_cards.annuity_end_date IS
'Annuity end date copied from originating quote for downstream workflow visibility.';