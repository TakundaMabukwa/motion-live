alter table public.job_cards
  add column if not exists old_serial_number text null,
  add column if not exists new_serial_number text null;
