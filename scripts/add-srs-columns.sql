-- Add missing columns to vehicles_duplicate table

ALTER TABLE public.vehicles_duplicate
ADD COLUMN IF NOT EXISTS canosh_rental text NULL,
ADD COLUMN IF NOT EXISTS installation_jc text NULL,
ADD COLUMN IF NOT EXISTS installation_date text NULL;
