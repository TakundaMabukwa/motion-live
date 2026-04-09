alter table public.vehicles_duplicate
  add column if not exists calibration boolean not null default false;

alter table public.vehicles
  add column if not exists calibration boolean not null default false;

comment on column public.vehicles_duplicate.calibration is
  'Whether the vehicle is currently marked for a calibration job workflow.';

comment on column public.vehicles.calibration is
  'Whether the vehicle is currently marked for a calibration job workflow.';
