ALTER TABLE public.vehicles
ADD COLUMN IF NOT EXISTS once_off_fees jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.vehicles_duplicate
ADD COLUMN IF NOT EXISTS once_off_fees jsonb NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.vehicles.once_off_fees IS
'Per-vehicle once-off billing items such as labour, installation, de-installation, cash fees and ad hoc charges. Stored separately from recurring rental/subscription columns.';

COMMENT ON COLUMN public.vehicles_duplicate.once_off_fees IS
'Per-vehicle once-off billing items such as labour, installation, de-installation, cash fees and ad hoc charges. Stored separately from recurring rental/subscription columns.';
PREVIOUS REG
