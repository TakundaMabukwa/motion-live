-- Track completion state for vehicles validated on FC duplicate vehicle screen.
ALTER TABLE public.vehicles_duplicate
ADD COLUMN IF NOT EXISTS vehicle_validated BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_vehicles_duplicate_vehicle_validated
ON public.vehicles_duplicate(vehicle_validated);

COMMENT ON COLUMN public.vehicles_duplicate.vehicle_validated IS
'Set to true when a vehicle is saved as validated on the FC vehicle validation page.';
