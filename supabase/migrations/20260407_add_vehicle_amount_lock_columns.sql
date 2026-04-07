alter table public.vehicles_duplicate
  add column if not exists amount_locked boolean not null default false,
  add column if not exists amount_locked_by uuid null,
  add column if not exists amount_locked_at timestamptz null;

alter table public.vehicles
  add column if not exists amount_locked boolean not null default false,
  add column if not exists amount_locked_by uuid null,
  add column if not exists amount_locked_at timestamptz null;

comment on column public.vehicles_duplicate.amount_locked is 'Whether the validated billing amount was explicitly locked by FC.';
comment on column public.vehicles_duplicate.amount_locked_by is 'Auth user id that locked the validated billing amount.';
comment on column public.vehicles_duplicate.amount_locked_at is 'Timestamp when the validated billing amount was locked.';
comment on column public.vehicles.amount_locked is 'Whether the validated billing amount was explicitly locked by FC.';
comment on column public.vehicles.amount_locked_by is 'Auth user id that locked the validated billing amount.';
comment on column public.vehicles.amount_locked_at is 'Timestamp when the validated billing amount was locked.';
