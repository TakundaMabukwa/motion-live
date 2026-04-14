alter table public.bulk_account_invoices
  add column if not exists system_locked boolean not null default false,
  add column if not exists system_locked_by uuid null,
  add column if not exists system_locked_at timestamptz null,
  add column if not exists system_locked_date date null;

comment on column public.bulk_account_invoices.system_locked is 'Whether this invoice was locked by the global billing system lock.';
comment on column public.bulk_account_invoices.system_locked_by is 'Auth user id that locked this invoice via system lock.';
comment on column public.bulk_account_invoices.system_locked_at is 'Timestamp when the system lock was applied.';
comment on column public.bulk_account_invoices.system_locked_date is 'Lock date that triggered the system lock.';
