create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  invoice_number text not null unique,
  job_card_id uuid not null references public.job_cards(id) on delete cascade,
  job_number text,
  quotation_number text,
  account_number text,
  client_name text,
  client_email text,
  client_phone text,
  client_address text,
  invoice_date timestamptz not null default now(),
  due_date date,
  payment_terms text,
  notes text,
  subtotal numeric(12,2) not null default 0,
  vat_amount numeric(12,2) not null default 0,
  discount_amount numeric(12,2) not null default 0,
  total_amount numeric(12,2) not null default 0,
  line_items jsonb not null default '[]'::jsonb,
  status text not null default 'generated',
  pdf_url text,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint invoices_job_card_id_key unique (job_card_id)
);

create index if not exists invoices_invoice_date_idx
  on public.invoices (invoice_date desc);

create index if not exists invoices_account_number_idx
  on public.invoices (account_number);

create or replace function public.set_updated_at_invoices()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trigger_set_updated_at_invoices on public.invoices;

create trigger trigger_set_updated_at_invoices
before update on public.invoices
for each row
execute function public.set_updated_at_invoices();
