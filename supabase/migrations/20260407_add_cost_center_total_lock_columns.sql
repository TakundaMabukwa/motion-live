alter table public.cost_centers
  add column if not exists total_amount_locked boolean not null default false,
  add column if not exists total_amount_locked_value numeric(12, 2) null,
  add column if not exists total_amount_locked_by uuid null,
  add column if not exists total_amount_locked_at timestamptz null;

comment on column public.cost_centers.total_amount_locked is 'Whether the FC validated grand total for this cost center was explicitly locked.';
comment on column public.cost_centers.total_amount_locked_value is 'Locked total_rental_sub amount for the cost center at the moment of FC lock.';
comment on column public.cost_centers.total_amount_locked_by is 'Auth user id that locked the FC validated cost center total.';
comment on column public.cost_centers.total_amount_locked_at is 'Timestamp when the FC validated cost center total was locked.';

