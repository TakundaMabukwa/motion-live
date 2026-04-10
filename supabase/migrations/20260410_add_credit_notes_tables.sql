insert into public.document_sequences (name, next_value)
values ('credit_note', 1000)
on conflict (name) do nothing;

alter table public.account_invoices
  add column if not exists credit_amount numeric(12, 2) not null default 0;

comment on column public.account_invoices.credit_amount is
  'Total credit notes applied to this invoice.';

create table if not exists public.credit_notes (
  id uuid primary key default gen_random_uuid(),
  credit_note_number text not null unique,
  account_number text not null,
  client_name text null,
  billing_month_applies_to date not null,
  credit_note_date timestamptz not null default now(),
  amount numeric(12, 2) not null,
  applied_amount numeric(12, 2) not null default 0,
  unapplied_amount numeric(12, 2) not null default 0,
  reference text null,
  comment text null,
  reason text null,
  status text not null default 'applied',
  account_invoice_id uuid null,
  created_by uuid null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.credit_note_applications (
  id uuid primary key default gen_random_uuid(),
  credit_note_id uuid not null references public.credit_notes(id) on delete cascade,
  account_number text not null,
  billing_month date not null,
  account_invoice_id uuid null,
  applied_to text not null default 'billing_period',
  amount numeric(12, 2) not null,
  bucket_application jsonb not null default '{}'::jsonb,
  reference text null,
  comment text null,
  created_by uuid null,
  created_at timestamptz not null default now()
);

create index if not exists idx_credit_notes_account_number
  on public.credit_notes (account_number);

create index if not exists idx_credit_notes_billing_month
  on public.credit_notes (billing_month_applies_to);

create index if not exists idx_credit_note_applications_credit_note
  on public.credit_note_applications (credit_note_id);

create index if not exists idx_credit_note_applications_account_month
  on public.credit_note_applications (account_number, billing_month);

create or replace function public.update_credit_notes_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trigger_update_credit_notes_updated_at on public.credit_notes;

create trigger trigger_update_credit_notes_updated_at
before update on public.credit_notes
for each row
execute function public.update_credit_notes_updated_at();
