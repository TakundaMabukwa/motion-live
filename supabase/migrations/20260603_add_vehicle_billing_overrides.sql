-- Add billing_overrides JSONB column for temporary monthly pricing overrides
-- Stores { "2026-06-01": { "beame_1_rental": 200 } } — overrides applied per billing month
ALTER TABLE public.vehicles_duplicate ADD COLUMN IF NOT EXISTS billing_overrides JSONB DEFAULT '{}'::jsonb;
