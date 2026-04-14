create table if not exists public.account_payment_allocations (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references public.account_invoice_payments(id) on delete cascade,
  account_number text not null,
  account_invoice_id uuid null references public.account_invoices(id) on delete set null,
  billing_month date null,
  allocation_type text not null,
  amount numeric(12, 2) not null,
  payment_date timestamptz not null,
  reference text null,
  notes text null,
  meta jsonb not null default '{}'::jsonb,
  created_by uuid null,
  created_by_email text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.account_payment_allocations is
  'Ledger allocation rows showing how a recorded payment was applied across invoices, aging buckets, or credit.';

comment on column public.account_payment_allocations.payment_id is
  'Source payment row from account_invoice_payments.';

comment on column public.account_payment_allocations.account_number is
  'Cost center or account code that received the payment allocation.';

comment on column public.account_payment_allocations.account_invoice_id is
  'Invoice row affected by this allocation when applicable.';

comment on column public.account_payment_allocations.billing_month is
  'Billing period the allocation applies to.';

comment on column public.account_payment_allocations.allocation_type is
  'Allocation target such as invoice, current_due, overdue_30_days, overdue_60_days, overdue_90_days, overdue_120_plus_days, or credit.';

comment on column public.account_payment_allocations.amount is
  'Allocated amount for this ledger row.';

comment on column public.account_payment_allocations.payment_date is
  'Effective payment date chosen by the user for the payment event.';

comment on column public.account_payment_allocations.reference is
  'User-entered payment reference copied onto the allocation row when available.';

comment on column public.account_payment_allocations.notes is
  'Free-form notes for this allocation entry.';

comment on column public.account_payment_allocations.meta is
  'Optional machine-readable allocation details for future reconciliation or audit needs.';

comment on column public.account_payment_allocations.created_by_email is
  'Email address of the user who created the allocation record.';

create index if not exists idx_account_payment_allocations_payment_id
  on public.account_payment_allocations (payment_id);

create index if not exists idx_account_payment_allocations_account_number
  on public.account_payment_allocations (account_number);

create index if not exists idx_account_payment_allocations_account_invoice_id
  on public.account_payment_allocations (account_invoice_id);

create index if not exists idx_account_payment_allocations_account_month
  on public.account_payment_allocations (account_number, billing_month);

create index if not exists idx_account_payment_allocations_payment_date
  on public.account_payment_allocations (payment_date desc);

create index if not exists idx_account_payment_allocations_type
  on public.account_payment_allocations (allocation_type);

create or replace function public.update_account_payment_allocations_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trigger_update_account_payment_allocations_updated_at
  on public.account_payment_allocations;

create trigger trigger_update_account_payment_allocations_updated_at
before update on public.account_payment_allocations
for each row
execute function public.update_account_payment_allocations_updated_at();
