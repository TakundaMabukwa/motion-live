alter table public.job_cards
  add column if not exists vehicle_chassis text null,
  add column if not exists vehicle_colour text null;
